const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const RoadSafetyTrack = await hre.ethers.getContractFactory("RoadSafetyTrack");
  const contract = await RoadSafetyTrack.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("RoadSafetyTrack deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
