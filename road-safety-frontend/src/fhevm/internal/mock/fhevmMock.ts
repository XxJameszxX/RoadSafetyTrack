import { Contract, JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);
  
  const inputVerifierContract = new Contract(
    parameters.metadata.InputVerifierAddress,
    [
      "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"
    ],
    provider
  );
  
  let verifyingContractAddressInputVerification: `0x${string}`;
  let gatewayChainId: number;
  
  try {
    const domain = await inputVerifierContract.eip712Domain();
    verifyingContractAddressInputVerification = domain[4] as `0x${string}`;
    gatewayChainId = Number(domain[3]);
    console.log(`[fhevmMockCreateInstance] InputVerifier EIP712 domain chainId: ${gatewayChainId}`);
    console.log(`[fhevmMockCreateInstance] verifyingContract: ${verifyingContractAddressInputVerification}`);
  } catch (error) {
    console.warn(`[fhevmMockCreateInstance] Failed to query EIP712 domain, using defaults:`, error);
    verifyingContractAddressInputVerification = "0x812b06e1CDCE800494b79fFE4f925A504a9A9810" as `0x${string}`;
    gatewayChainId = 55815;
  }
  
  const instance = await MockFhevmInstance.create(
    provider,
    provider,
    {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption:
        "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification,
    },
    {
      inputVerifierProperties: {},
      kmsVerifierProperties: {},
    }
  );
  
  console.log("[fhevmMockCreateInstance] ✅ Mock FHEVM instance created successfully");
  
  return instance as unknown as FhevmInstance;
};

