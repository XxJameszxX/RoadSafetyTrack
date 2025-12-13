import { ethers } from "hardhat";

async function main() {
  // Get deployed contract address
  const deployment = await import("../deployments/localhost/RoadSafetyTrack.json");
  const contractAddress = deployment.address;

  // Get user address from command line arguments, use first argument if provided
  const userAddress = process.argv[2];
  
  if (!userAddress) {
    console.error("Usage: npx hardhat run scripts/reset-user-time.ts --network localhost <userAddress>");
    console.error("Example: npx hardhat run scripts/reset-user-time.ts --network localhost 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199");
    process.exit(1);
  }

  console.log(`Connecting to contract at: ${contractAddress}`);
  console.log(`Resetting submit time for user: ${userAddress}`);

  // Get signer (deployer account, i.e., admin)
  const [deployer] = await ethers.getSigners();
  console.log(`Using admin account: ${deployer.address}`);

  // Connect to contract
  const RoadSafetyTrack = await ethers.getContractFactory("RoadSafetyTrack");
  const contract = RoadSafetyTrack.attach(contractAddress);

  // Check test mode
  const testMode = await contract.testMode();
  if (!testMode) {
    console.error("❌ Test mode is not enabled! Please enable it first:");
    console.error("   npx hardhat run scripts/enable-test-mode.ts --network localhost");
    process.exit(1);
  }

  // Reset user submit time
  console.log("Resetting user submit time...");
  const tx = await contract.resetUserSubmitTime(userAddress);
  await tx.wait();

  console.log("✅ User submit time reset successfully!");
  console.log(`Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
