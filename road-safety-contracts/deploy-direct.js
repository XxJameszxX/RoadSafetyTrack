const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const signers = await provider.getSigner();
  const deployer = await signers.getAddress();
  console.log("Deploying with account:", deployer);

  const RoadSafetyTrack = await ethers.getContractFactory("RoadSafetyTrack");
  const contract = await RoadSafetyTrack.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("RoadSafetyTrack deployed to:", address);
  
  // Save to deployments folder
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "deployments", "localhost");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const deployment = {
    address: address,
    abi: RoadSafetyTrack.interface.format("json"),
  };
  fs.writeFileSync(
    path.join(deploymentsDir, "RoadSafetyTrack.json"),
    JSON.stringify(deployment, null, 2)
  );
  console.log("Deployment info saved!");
}

main().catch(console.error);
