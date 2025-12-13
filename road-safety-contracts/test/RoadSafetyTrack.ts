import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { RoadSafetyTrack, RoadSafetyTrack__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("RoadSafetyTrack")) as RoadSafetyTrack__factory;
  const contract = (await factory.deploy()) as RoadSafetyTrack;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("RoadSafetyTrack", function () {
  let signers: Signers;
  let contract: RoadSafetyTrack;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("should have zero records after deployment", async function () {
    const [recordCount] = await contract.getUserStats(signers.alice.address);
    expect(recordCount).to.eq(0);
  });

  it("should submit first score successfully", async function () {
    const score = 85;
    const mileageLevel = 2; // Medium distance

    // Encrypt score
    const encryptedScore = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(score)
      .encrypt();

    // Submit score
    const tx = await contract
      .connect(signers.alice)
      .submitScore(encryptedScore.handles[0], encryptedScore.inputProof, mileageLevel);
    await tx.wait();

    // Check record count
    const [recordCount, consecutiveDays] = await contract.getUserStats(signers.alice.address);
    expect(recordCount).to.eq(1);
    expect(consecutiveDays).to.eq(1);

    // Get latest record
    const latestRecord = await contract.getLatestRecord(signers.alice.address);
    expect(latestRecord.mileageLevel).to.eq(mileageLevel);

    // Decrypt and verify score
    const decryptedScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      latestRecord.encScore,
      contractAddress,
      signers.alice
    );
    expect(decryptedScore).to.eq(score);
  });

  it("should calculate trend correctly", async function () {
    // First submission: score = 80
    const score1 = 80;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(score1)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .submitScore(encrypted1.handles[0], encrypted1.inputProof, 1);
    await tx.wait();

    // Second submission: score = 90 (improved)
    const score2 = 90;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(score2)
      .encrypt();

    // Fast forward time to allow second submission
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    tx = await contract
      .connect(signers.alice)
      .submitScore(encrypted2.handles[0], encrypted2.inputProof, 2);
    await tx.wait();

    // Get trend (should be positive: 90 - 80 = 10)
    const encTrend = await contract.getTrend(signers.alice.address);
    const trend = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encTrend,
      contractAddress,
      signers.alice
    );
    expect(trend).to.eq(10); // 90 - 80 = 10 (improved)
  });

  it("should calculate average correctly", async function () {
    const scores = [70, 80, 90];
    
    for (let i = 0; i < scores.length; i++) {
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(scores[i])
        .encrypt();

      if (i > 0) {
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine", []);
      }

      const tx = await contract
        .connect(signers.alice)
        .submitScore(encrypted.handles[0], encrypted.inputProof, 1);
      await tx.wait();
    }

    // Get average data
    const [encTotal, count] = await contract.getAverageData(signers.alice.address);
    expect(count).to.eq(3);

    // Decrypt total
    const total = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encTotal,
      contractAddress,
      signers.alice
    );
    expect(total).to.eq(240); // 70 + 80 + 90 = 240
    // Average = 240 / 3 = 80 (calculated in frontend)
  });

  it("should track consecutive days", async function () {
    // Day 1
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(85)
      .encrypt();
    let tx = await contract
      .connect(signers.alice)
      .submitScore(encrypted1.handles[0], encrypted1.inputProof, 1);
    await tx.wait();

    let [, consecutiveDays] = await contract.getUserStats(signers.alice.address);
    expect(consecutiveDays).to.eq(1);

    // Day 2 (within 25 hours)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(88)
      .encrypt();
    tx = await contract
      .connect(signers.alice)
      .submitScore(encrypted2.handles[0], encrypted2.inputProof, 2);
    await tx.wait();

    [, consecutiveDays] = await contract.getUserStats(signers.alice.address);
    expect(consecutiveDays).to.eq(2);

    // Day 3
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const encrypted3 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(90)
      .encrypt();
    tx = await contract
      .connect(signers.alice)
      .submitScore(encrypted3.handles[0], encrypted3.inputProof, 1);
    await tx.wait();

    [, consecutiveDays] = await contract.getUserStats(signers.alice.address);
    expect(consecutiveDays).to.eq(3);
  });

  it("should prevent multiple submissions per day", async function () {
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(85)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .submitScore(encrypted.handles[0], encrypted.inputProof, 1);
    await tx.wait();

    // Try to submit again immediately (should fail)
    await expect(
      contract
        .connect(signers.alice)
        .submitScore(encrypted.handles[0], encrypted.inputProof, 1)
    ).to.be.revertedWith("Only one submission per day");
  });
});

