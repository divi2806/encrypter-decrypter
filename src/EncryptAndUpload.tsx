import React, { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from './networkConfig';
import { useSuiClient } from '@mysten/dapp-kit';
import { useSponsoredExecute, getSponsorAddress } from './sponsor';
import { Button, Card, Flex, Spinner, Text, Heading, Separator, Callout } from '@radix-ui/themes';
import { getAllowlistedKeyServers, SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';

export type Data = {
  status: string;
  blobId: string;
  endEpoch: string;
  suiRefType: string;
  suiRef: string;
  suiBaseUrl: string;
  blobUrl: string;
  suiUrl: string;
  isImage: string;
};

interface WalrusUploadProps {
  policyObject: string;
  cap_id: string;
  moduleName: string;
}

type WalrusService = {
  id: string;
  name: string;
  publisherUrl: string;
  aggregatorUrl: string;
};

export function WalrusUpload({ policyObject, cap_id, moduleName }: WalrusUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Data | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('service1');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const SUI_VIEW_TX_URL = `https://suiscan.xyz/testnet/tx`;
  const SUI_VIEW_OBJECT_URL = `https://suiscan.xyz/testnet/object`;

  const NUM_EPOCH = 1;
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const sponsoredExecute = useSponsoredExecute();
  const sponsorAddress = getSponsorAddress();
  const [debug, setDebug] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const client = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers('testnet').map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  const services: WalrusService[] = [
    {
      id: 'service1',
      name: 'cetus.zone',
      publisherUrl: '/publisher1',
      aggregatorUrl: '/aggregator1',
    },
    {
      id: 'service2',
      name: 'staketab.org',
      publisherUrl: '/publisher2',
      aggregatorUrl: '/aggregator2',
    },
    {
      id: 'service3',
      name: 'redundex.com',
      publisherUrl: '/publisher3',
      aggregatorUrl: '/aggregator3',
    },
    {
      id: 'service4',
      name: 'nodes.guru',
      publisherUrl: '/publisher4',
      aggregatorUrl: '/aggregator4',
    },
    {
      id: 'service5',
      name: 'banansen.dev',
      publisherUrl: '/publisher5',
      aggregatorUrl: '/aggregator5',
    },
    {
      id: 'service6',
      name: 'mhax.io',
      publisherUrl: '/publisher6',
      aggregatorUrl: '/aggregator6',
    },
  ];

  function getAggregatorUrl(path: string): string {
    const service = services.find((s) => s.id === selectedService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.aggregatorUrl}/v1/${cleanPath}`;
  }

  function getPublisherUrl(path: string): string {
    const service = services.find((s) => s.id === selectedService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.publisherUrl}/v1/${cleanPath}`;
  }

  

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    // Max 10 MiB size
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10 MiB');
      return;
    }
    setFile(file);
    setInfo(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10 MiB');
        return;
      }
      setFile(f);
      setInfo(null);
    }
  };

  const handleSubmit = () => {
    setIsUploading(true);
    if (file) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        if (event.target && event.target.result) {
          const result = event.target.result;
          if (result instanceof ArrayBuffer) {
            const nonce = crypto.getRandomValues(new Uint8Array(5));
            const policyObjectBytes = fromHex(policyObject);
            const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));
            const { encryptedObject: encryptedBytes } = await client.encrypt({
              threshold: 2,
              packageId,
              id,
              data: new Uint8Array(result),
            });
            const storageInfo = await storeBlob(encryptedBytes);
            displayUpload(storageInfo.info, file.type);
            setIsUploading(false);
          } else {
            console.error('Unexpected result type:', typeof result);
            setIsUploading(false);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error('No file selected');
    }
  };

  const displayUpload = (storage_info: any, media_type: any) => {
    let info;
    if ('alreadyCertified' in storage_info) {
      info = {
        status: 'Already certified',
        blobId: storage_info.alreadyCertified.blobId,
        endEpoch: storage_info.alreadyCertified.endEpoch,
        suiRefType: 'Previous Sui Certified Event',
        suiRef: storage_info.alreadyCertified.event.txDigest,
        suiBaseUrl: SUI_VIEW_TX_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.alreadyCertified.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.alreadyCertified.event.txDigest}`,
        isImage: media_type.startsWith('image'),
      };
    } else if ('newlyCreated' in storage_info) {
      info = {
        status: 'Newly created',
        blobId: storage_info.newlyCreated.blobObject.blobId,
        endEpoch: storage_info.newlyCreated.blobObject.storage.endEpoch,
        suiRefType: 'Associated Sui Object',
        suiRef: storage_info.newlyCreated.blobObject.id,
        suiBaseUrl: SUI_VIEW_OBJECT_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.newlyCreated.blobObject.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.newlyCreated.blobObject.id}`,
        isImage: media_type.startsWith('image'),
      };
    } else {
      throw Error('Unhandled successful response!');
    }
    setInfo(info);
  };

  const storeBlob = (encryptedData: Uint8Array) => {
    return fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`)}`, {
      method: 'PUT',
      body: encryptedData,
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((info) => {
          return { info };
        });
      } else {
        alert('Error publishing the blob on Walrus, please select a different Walrus service.');
        setIsUploading(false);
        throw new Error('Something went wrong when storing the blob!');
      }
    });
  };

  async function handlePublish(wl_id: string, cap_id: string, moduleName: string) {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::${moduleName}::publish`,
      arguments: [tx.object(wl_id), tx.object(cap_id), tx.pure.string(info!.blobId)],
    });

    tx.setGasBudget(10000000);
    sponsoredExecute(tx)
      .then((result) => {
        console.log('publish association success', result);
        const digest = (result as any)?.digest ?? (result as any)?.effectsDigest;
        setDebug({ kind: 'success', message: `Publish succeeded. Tx: ${digest || 'unknown'} | Sponsor: ${sponsorAddress}` });
        alert('Blob attached successfully, now share the link or upload more.');
      })
      .catch((e) => {
        console.error('publish association error', e);
        setDebug({ kind: 'error', message: `Publish failed. Sponsor: ${sponsorAddress}. ${String(e)}` });
      });
  }

  return (
    <Card>
      <Flex direction="column" gap="3" align="start">
        {debug && (
          <Callout.Root color={debug.kind === 'success' ? 'green' : 'red'}>
            <Callout.Text>{debug.message}</Callout.Text>
          </Callout.Root>
        )}
        <Heading size="5">Encrypt & Upload</Heading>
        <Text color="gray" size="3">
          Files are encrypted locally via Seal and uploaded to Walrus. After upload, associate the
          blob to your allowlist so viewers can find it.
        </Text>
        <Separator size="4" my="2" />
        <Flex gap="2" align="center">
          <Text>Walrus service</Text>
          <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} aria-label="Select Walrus service">
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </Flex>
        <Flex direction="column" gap="2" style={{ width: '100%' }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`dropzone ${dragActive ? 'active' : ''}`}
            style={{ width: '100%', padding: '24px', textAlign: 'center' }}
          >
            <Text color="gray">Drag & drop a file here</Text>
          </div>
          <input
            type="file"
            onChange={handleFileChange}
            accept="*/*"
            aria-label="Choose file to upload"
          />
        </Flex>
        <Callout.Root color="amber">
          <Callout.Text>Max size 10 MiB. Images, documents, text, archives and more are supported.</Callout.Text>
        </Callout.Root>
        <Button
          onClick={() => {
            handleSubmit();
          }}
          disabled={file === null}
        >
          Encrypt & Upload to Walrus
        </Button>
        {isUploading && (
          <div role="status">
            <Spinner className="animate-spin" aria-label="Uploading" />
            <span> Uploading to Walrus… </span>
          </div>
        )}

        {info && file && (
          <div id="uploaded-blobs" role="region" aria-label="Upload details">
            <dl>
              <dt>Status:</dt>
              <dd>{info.status}</dd>
              <dd>
                <a
                  href={info.blobUrl}
                  style={{ textDecoration: 'underline' }}
                  download
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(info.blobUrl, '_blank', 'noopener,noreferrer');
                  }}
                  aria-label="Download encrypted blob"
                >
                  Encrypted blob
                </a>
              </dd>
              <dd>
                <a
                  href={info.suiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                  aria-label="View Sui object details"
                >
                  Sui Object
                </a>
              </dd>
            </dl>
          </div>
        )}
        <Button
          onClick={() => {
            handlePublish(policyObject, cap_id, moduleName);
          }}
          disabled={!info || !file || policyObject === ''}
          aria-label="Encrypt and upload file"
        >
          Associate Blob to Allowlist
        </Button>
      </Flex>
    </Card>
  );
}

export default WalrusUpload;
