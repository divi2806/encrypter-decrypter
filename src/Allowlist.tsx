// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Heading, Text, TextField, Separator, Callout } from '@radix-ui/themes';
import { useSponsoredExecute, getSponsorAddress } from './sponsor';
import { useNetworkVariable } from './networkConfig';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { getObjectExplorerLink } from './utils';

export interface Allowlist {
  id: string;
  name: string;
  list: string[];
}

interface AllowlistProps {
  setRecipientAllowlist: React.Dispatch<React.SetStateAction<string>>;
  setCapId: React.Dispatch<React.SetStateAction<string>>;
}

export function Allowlist({ setRecipientAllowlist, setCapId }: AllowlistProps) {
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [allowlist, setAllowlist] = useState<Allowlist>();
  const { id } = useParams();
  const [capId, setInnerCapId] = useState<string>();
  const sponsorAddress = getSponsorAddress();
  const [debug, setDebug] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [newAddress, setNewAddress] = useState<string>("");

  useEffect(() => {
    async function getAllowlist() {
      // load all caps
      const res = await suiClient.getOwnedObjects({
        owner: currentAccount?.address!,
        options: {
          showContent: true,
          showType: true,
        },
        filter: {
          StructType: `${packageId}::allowlist::Cap`,
        },
      });

      // find the cap for the given allowlist id
      const capId = res.data
        .map((obj) => {
          const fields = (obj!.data!.content as { fields: any }).fields;
          return {
            id: fields?.id.id,
            allowlist_id: fields?.allowlist_id,
          };
        })
        .filter((item) => item.allowlist_id === id)
        .map((item) => item.id) as string[];
      setCapId(capId[0]);
      setInnerCapId(capId[0]);

      // load the allowlist for the given id
      const allowlist = await suiClient.getObject({
        id: id!,
        options: { showContent: true },
      });
      const fields = (allowlist.data?.content as { fields: any })?.fields || {};
      setAllowlist({
        id: id!,
        name: fields.name,
        list: fields.list,
      });
      setRecipientAllowlist(id!);
    }

    // Call getAllowlist immediately
    getAllowlist();

    // Set up interval to call getAllowlist every 3 seconds
    const intervalId = setInterval(() => {
      getAllowlist();
    }, 3000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [id, currentAccount?.address]); // Only depend on id

  const sponsoredExecute = useSponsoredExecute();

  const addItem = (newAddressToAdd: string, wl_id: string, cap_id: string) => {
    if (newAddressToAdd.trim() !== '') {
      if (!isValidSuiAddress(newAddressToAdd.trim())) {
        alert('Invalid address');
        return;
      }
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(wl_id), tx.object(cap_id), tx.pure.address(newAddressToAdd.trim())],
        target: `${packageId}::allowlist::add`,
      });
      tx.setGasBudget(10000000);

      sponsoredExecute(tx)
        .then((result) => {
          console.log('sponsored add success', result);
          const digest = (result as any)?.digest ?? (result as any)?.effectsDigest;
          setDebug({
            kind: 'success',
            message: `Add succeeded. Tx: ${digest || 'unknown'} | Sender: ${currentAccount?.address} | Sponsor: ${sponsorAddress}`,
          });
        })
        .catch((e) => {
          console.error('sponsored add error', e);
          setDebug({ kind: 'error', message: `Add failed. Sender: ${currentAccount?.address} | Sponsor: ${sponsorAddress}. ${String(e)}` });
        });
    }
  };

  const removeItem = (addressToRemove: string, wl_id: string, cap_id: string) => {
    if (addressToRemove.trim() !== '') {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(wl_id), tx.object(cap_id), tx.pure.address(addressToRemove.trim())],
        target: `${packageId}::allowlist::remove`,
      });
      tx.setGasBudget(10000000);

      sponsoredExecute(tx)
        .then((result) => {
          console.log('sponsored remove success', result);
          const digest = (result as any)?.digest ?? (result as any)?.effectsDigest;
          setDebug({
            kind: 'success',
            message: `Remove succeeded. Tx: ${digest || 'unknown'} | Sender: ${currentAccount?.address} | Sponsor: ${sponsorAddress}`,
          });
        })
        .catch((e) => {
          console.error('sponsored remove error', e);
          setDebug({ kind: 'error', message: `Remove failed. Sender: ${currentAccount?.address} | Sponsor: ${sponsorAddress}. ${String(e)}` });
        });
    }
  };

  return (
    <Flex direction="column" gap="2" justify="start">
      <Card key={`${allowlist?.id}`}>
        <Callout.Root color="blue" mb="2">
          <Callout.Text>Using sponsor wallet: {sponsorAddress}</Callout.Text>
        </Callout.Root>
        {debug && (
          <Callout.Root color={debug.kind === 'success' ? 'green' : 'red'} mb="2">
            <Callout.Text>{debug.message}</Callout.Text>
          </Callout.Root>
        )}
        <Heading size="5" style={{ marginBottom: '0.5rem' }}>
          Allowlist: {allowlist?.name} (ID {allowlist?.id && getObjectExplorerLink(allowlist.id)})
        </Heading>
        <Text color="gray" size="3" style={{ marginBottom: '1rem' }}>
          Manage members and share the public link with users who should view the encrypted files.
        </Text>

        <Callout.Root>
          <Callout.Text>
            Share{' '}
            <a
              href={`${window.location.origin}/allowlist/view/${allowlist?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline' }}
            >
              this link
            </a>{' '}
            with users to access encrypted files for this allowlist.
          </Callout.Text>
        </Callout.Root>
        <Separator my="2" size="4" />

        <Flex direction="row" gap="2">
          <TextField.Root
            placeholder="Add Sui address"
            value={newAddress}
            onChange={(e) => setNewAddress((e.target as HTMLInputElement).value)}
          />
          <Button
            onClick={(e) => {
              addItem(newAddress, id!, capId!);
              setNewAddress('');
            }}
          >
            Add
          </Button>
        </Flex>

        <Heading size="3" style={{ marginTop: '1rem' }}>
          Allowed Users
        </Heading>
        {Array.isArray(allowlist?.list) && allowlist?.list.length > 0 ? (
          <ul>
            {allowlist?.list.map((listItem, itemIndex) => (
              <li key={itemIndex}>
                <Flex direction="row" gap="2">
                  <p>{listItem}</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(listItem, id!, capId!);
                    }}
                  >
                    <X />
                  </Button>
                </Flex>
              </li>
            ))}
          </ul>
        ) : (
          <Text color="gray">No user in this allowlist.</Text>
        )}
      </Card>
    </Flex>
  );
}
