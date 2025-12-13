import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstanceConfig } from "@zama-fhe/relayer-sdk/web";
import type { HandleContractPair } from "@zama-fhe/relayer-sdk/bundle";

// UserDecryptResults type - using any for now to avoid import issues
export type UserDecryptResults = any;
export type DecryptedResults = UserDecryptResults;

export type { FhevmInstance, FhevmInstanceConfig, HandleContractPair };

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
};

export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  message: any;
  primaryType: string;
  types: {
    [key: string]: {
      name: string;
      type: string;
    }[];
  };
};

export type FhevmRelayerSDKType = {
  initSDK: (options?: unknown) => Promise<boolean>;
  createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
  SepoliaConfig: {
    aclContractAddress: `0x${string}`;
    chainId: number;
    gatewayChainId: number;
    inputVerifierContractAddress: `0x${string}`;
    kmsContractAddress: `0x${string}`;
    verifyingContractAddressDecryption: `0x${string}`;
    verifyingContractAddressInputVerification: `0x${string}`;
  };
  __initialized__?: boolean;
};

export type FhevmWindowType = {
  relayerSDK: FhevmRelayerSDKType;
};

export type FhevmInitSDKOptions = unknown;
export type FhevmLoadSDKType = () => Promise<void>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;

