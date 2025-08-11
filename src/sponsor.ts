import { useSuiClient, useSignTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// WARNING: For demo only
const SPONSOR_PRIVATE_KEY = 'suiprivkey1qrcmny2gqtfuptu4u8cusrh7mevdu5nnwe95dhzfkwafrut55tc8wvymdue';

export function useSponsoredExecute() {
  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const currentAccount = useCurrentAccount();

  return async (tx: Transaction) => {
    if (!currentAccount?.address) throw new Error('No connected wallet');


    const { secretKey } = decodeSuiPrivateKey(SPONSOR_PRIVATE_KEY);
    const sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();

    // Set sender (user) and gas owner 
    tx.setSender(currentAccount.address);
    tx.setGasOwner(sponsorAddress);
    if (!tx.getData().gasData.budget) {
      tx.setGasBudget(10_000_000);
    }

    // Build and collect signatures
    const txBytes = await tx.build({ client: suiClient });
    const { signature: userSignature } = await signTransaction({ transaction: tx });
    const sponsorSignature = await sponsorKeypair.signTransaction(txBytes);

    // Execute with both signatures
    return suiClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: [userSignature, sponsorSignature.signature],
      options: { showEffects: true, showRawEffects: true },
      requestType: 'WaitForLocalExecution',
    });
  };
}

export function getSponsorAddress(): string {
  const { secretKey } = decodeSuiPrivateKey(SPONSOR_PRIVATE_KEY);
  const kp = Ed25519Keypair.fromSecretKey(secretKey);
  return kp.getPublicKey().toSuiAddress();
}


