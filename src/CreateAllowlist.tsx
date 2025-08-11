import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Heading, Text, TextField, Separator } from '@radix-ui/themes';
import { useSuiClient } from '@mysten/dapp-kit';
import { useState } from 'react';
import { useNetworkVariable } from './networkConfig';
import { useNavigate } from 'react-router-dom';
import { useSponsoredExecute, getSponsorAddress } from './sponsor';

export function CreateAllowlist() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const sponsoredExecute = useSponsoredExecute();
  const sponsorAddress = getSponsorAddress();
  const [debug, setDebug] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  function createAllowlist(name: string) {
    if (name === '') {
      alert('Please enter a name for the allowlist');
      return;
    }
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::allowlist::create_allowlist_entry`,
      arguments: [tx.pure.string(name)],
    });
    tx.setGasBudget(10000000);
    sponsoredExecute(tx)
      .then((result) => {
        console.log('create allowlist success', result);
        const digest = (result as any)?.digest ?? (result as any)?.effectsDigest;
        setDebug({ kind: 'success', message: `Create succeeded. Tx: ${digest || 'unknown'} | Sponsor: ${sponsorAddress}` });
        const created = (result as any).effects?.created ?? [];
        const allowlistObject = created.find(
          (item: any) => item.owner && typeof item.owner === 'object' && 'Shared' in item.owner,
        );
        const createdObjectId = allowlistObject?.reference?.objectId;
        if (createdObjectId) {
          window.open(`${window.location.origin}/allowlist/admin/${createdObjectId}`, '_blank');
        }
      })
      .catch((e) => {
        console.error('create allowlist error', e);
        setDebug({ kind: 'error', message: `Create failed. Sponsor: ${sponsorAddress}. ${String(e)}` });
      });
  }

  const handleViewAll = () => {
    navigate(`/allowlist/admin`);
  };

  return (
    <Card>
      {debug && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ opacity: 0.8 }}>{debug.message}</p>
        </div>
      )}
      <Flex direction="column" gap="3">
        <Heading size="5">Create a new allowlist</Heading>
        <Text color="gray" size="3">
          Name your allowlist and create it on-chain. You’ll receive an admin capability to manage
          members and attach encrypted files.
        </Text>
        <Separator size="4" my="2" />
        <Flex direction="row" gap="3" align="center">
          <TextField.Root placeholder="Allowlist Name" onChange={(e) => setName(e.target.value)} />
          <Button size="3" onClick={() => createAllowlist(name)}>
            Create Allowlist
          </Button>
          <Button size="3" variant="soft" onClick={handleViewAll}>
            View Your Allowlists
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
