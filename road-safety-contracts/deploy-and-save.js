const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  const RoadSafetyTrack = await ethers.getContractFactory("RoadSafetyTrack");
  const contract = await RoadSafetyTrack.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("RoadSafetyTrack deployed to:", address);
  
  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, "deployments", "localhost");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deployment = {
    address: address,
    abi: JSON.parse(RoadSafetyTrack.interface.formatJson()),
  };
  
  fs.writeFileSync(
    path.join(deploymentsDir, "RoadSafetyTrack.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("✅ Deployment info saved to deployments/localhost/RoadSafetyTrack.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
