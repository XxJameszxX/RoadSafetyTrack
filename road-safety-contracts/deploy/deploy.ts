import { HardhatRuntimeEnvironment } from "hardhat/types";

export default async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedRoadSafety = await deploy("RoadSafetyTrack", {
    from: deployer,
    log: true,
  });

  console.log(`RoadSafetyTrack contract deployed at: ${deployedRoadSafety.address}`);
};

