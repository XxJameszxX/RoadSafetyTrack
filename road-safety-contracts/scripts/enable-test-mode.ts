import { ethers } from "hardhat";

async function main() {
  // Get deployed contract address
  const deployment = await import("../deployments/localhost/RoadSafetyTrack.json");
  const contractAddress = deployment.address;

  console.log(`Connecting to contract at: ${contractAddress}`);

  // Get signer (deployer account)
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // Connect to contract
  const RoadSafetyTrack = await ethers.getContractFactory("RoadSafetyTrack");
  const contract = RoadSafetyTrack.attach(contractAddress);

  // Enable test mode
  console.log("Enabling test mode...");
  const tx = await contract.setTestMode(true);
  await tx.wait();

  console.log("✅ Test mode enabled!");
  console.log(`Transaction hash: ${tx.hash}`);

  // Verify test mode status
  const testMode = await contract.testMode();
  console.log(`Test mode status: ${testMode}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
