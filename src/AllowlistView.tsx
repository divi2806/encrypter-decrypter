import { useEffect, useState } from 'react';
import { useSignPersonalMessage, useSuiClient } from '@mysten/dapp-kit';
import { useNetworkVariable } from './networkConfig';
import { AlertDialog, Button, Card, Dialog, Flex, Grid, Heading, Text, Separator } from '@radix-ui/themes';
import { fromHex } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import {
  getAllowlistedKeyServers,
  KeyServerConfig,
  SealClient,
  SessionKey,
  type SessionKeyType,
} from '@mysten/seal';
import { useParams } from 'react-router-dom';
import { downloadAndDecrypt, getObjectExplorerLink, MoveCallConstructor, type DecryptedFile } from './utils';
import { set, get } from 'idb-keyval';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const TTL_MIN = 10;
export interface FeedData {
  allowlistId: string;
  allowlistName: string;
  blobIds: string[];
}

function constructMoveCall(packageId: string, allowlistId: string): MoveCallConstructor {
  return (tx: Transaction, id: string) => {
    tx.moveCall({
      target: `${packageId}::allowlist::seal_approve`,
      arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(allowlistId)],
    });
  };
}

const Feeds: React.FC<{ suiAddress: string }> = ({ suiAddress }) => {
  const suiClient = useSuiClient();
  const client = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers('testnet').map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });
  const packageId = useNetworkVariable('packageId');
  const mvrName = useNetworkVariable('mvrName');

  const [feed, setFeed] = useState<FeedData>();
  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  useEffect(() => {
    // Call getFeed immediately
    getFeed();

    // Set up interval to call getFeed every 3 seconds
    const intervalId = setInterval(() => {
      getFeed();
    }, 3000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [id, suiClient, packageId]);

  async function getFeed() {
    const allowlist = await suiClient.getObject({
      id: id!,
      options: { showContent: true },
    });
    const encryptedObjects = await suiClient
      .getDynamicFields({
        parentId: id!,
      })
      .then((res: { data: any[] }) => res.data.map((obj) => obj.name.value as string));
    const fields = (allowlist.data?.content as { fields: any })?.fields || {};
    const feedData = {
      allowlistId: id!,
      allowlistName: fields?.name,
      blobIds: encryptedObjects,
    };
    setFeed(feedData);
  }

  const onView = async (blobIds: string[], allowlistId: string) => {
    const imported: SessionKeyType = await get('sessionKey');

    if (imported) {
      try {
        const currentSessionKey = await SessionKey.import(
          imported,
          new SuiClient({ url: getFullnodeUrl('testnet') }),
        );
        console.log('loaded currentSessionKey', currentSessionKey);
        if (
          currentSessionKey &&
          !currentSessionKey.isExpired() &&
          currentSessionKey.getAddress() === suiAddress
        ) {
          const moveCallConstructor = constructMoveCall(packageId, allowlistId);
          downloadAndDecrypt(
            blobIds,
            currentSessionKey,
            suiClient,
            client,
            moveCallConstructor,
            setError,
            setDecryptedFiles,
            setIsDialogOpen,
            setReloadKey,
          );
          return;
        }
      } catch (error) {
        console.log('Imported session key is expired', error);
      }
    }

    set('sessionKey', null);

    const sessionKey = await SessionKey.create({
      address: suiAddress,
      packageId,
      ttlMin: TTL_MIN,
      suiClient,
      mvrName,
    });

    try {
      signPersonalMessage(
        {
          message: sessionKey.getPersonalMessage(),
        },
        {
          onSuccess: async (result: { signature: string }) => {
            await sessionKey.setPersonalMessageSignature(result.signature);
            const moveCallConstructor = await constructMoveCall(packageId, allowlistId);
            await downloadAndDecrypt(
              blobIds,
              sessionKey,
              suiClient,
              client,
              moveCallConstructor,
              setError,
              setDecryptedFiles,
              setIsDialogOpen,
              setReloadKey,
            );
            set('sessionKey', sessionKey.export());
          },
        },
      );
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  return (
    <Card>
      <Heading size="5" style={{ marginBottom: '0.5rem' }}>
        Files for Allowlist {feed?.allowlistName} (ID {feed?.allowlistId && getObjectExplorerLink(feed.allowlistId)})
      </Heading>
      {feed === undefined ? (
        <Text color="gray">No files found for this allowlist.</Text>
      ) : (
        <Grid columns="2" gap="3">
          <Card key={feed!.allowlistId}>
            <Flex direction="column" align="start" gap="2">
              {feed!.blobIds.length === 0 ? (
                <Text color="gray">No files found for this allowlist.</Text>
              ) : (
                <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <Dialog.Trigger>
                    <Button onClick={() => onView(feed!.blobIds, feed!.allowlistId)}>
                      Download And Decrypt All Files
                    </Button>
                  </Dialog.Trigger>
                  {decryptedFiles.length > 0 && (
                      <Dialog.Content maxWidth="600px" key={reloadKey}>
                      <Dialog.Title>Decrypted files</Dialog.Title>
                      <Flex direction="column" gap="3">
                        {decryptedFiles.map((file, index) => (
                          <Card key={index}>
                            <Flex direction="column" gap="2" align="start">
                              <img
                                src={file.url}
                                alt={`Decrypted preview ${index + 1}`}
                                style={{ maxWidth: '100%', borderRadius: 8 }}
                                onError={(e) => {
                                  // Hide image if not previewable (non-image types)
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <Flex gap="2">
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="soft">Open</Button>
                                </a>
                                <a href={file.url} download={file.filename}>
                                  <Button>Download</Button>
                                </a>
                              </Flex>
                            </Flex>
                          </Card>
                        ))}
                      </Flex>
                      <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                          <Button
                            variant="soft"
                            color="gray"
                            onClick={() => setDecryptedFiles([])}
                          >
                            Close
                          </Button>
                        </Dialog.Close>
                      </Flex>
                    </Dialog.Content>
                  )}
                </Dialog.Root>
              )}
            </Flex>
          </Card>
        </Grid>
      )}
      <AlertDialog.Root open={!!error} onOpenChange={() => setError(null)}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Error</AlertDialog.Title>
          <AlertDialog.Description size="2">{error}</AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Action>
              <Button variant="solid" color="gray" onClick={() => setError(null)}>
                Close
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Card>
  );
};

export default Feeds;
