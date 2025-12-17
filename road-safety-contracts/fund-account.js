const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const testAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // User test account
  
  console.log("Deployer account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Test account balance:", ethers.formatEther(await ethers.provider.getBalance(testAddress)), "ETH");
  
  // Send 100 ETH to test account
  const tx = await deployer.sendTransaction({
    to: testAddress,
    value: ethers.parseEther("100.0")
  });
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  
  console.log("✅ Transfer completed!");
  console.log("Test account new balance:", ethers.formatEther(await ethers.provider.getBalance(testAddress)), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
