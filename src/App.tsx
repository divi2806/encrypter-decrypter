// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Box, Button, Card, Container, Flex, Grid, Heading, Text, Callout, Separator } from '@radix-ui/themes';
import { CreateAllowlist } from './CreateAllowlist';
import { Allowlist } from './Allowlist';
import WalrusUpload from './EncryptAndUpload';
import { useState } from 'react';
// Subscription examples are hidden for this UI variant focusing only on Allowlist
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AllAllowlist } from './OwnedAllowlists';
import Feeds from './AllowlistView';

function LandingPage() {
  return (
    <Card className="glass-card">
      <Flex direction="column" gap="3" align="start">
        <Heading size="7" className="brand-gradient">Allowlist-secured content</Heading>
        <Text size="3" color="gray">
          Create an allowlist, grant access to Sui addresses, encrypt files client-side with Seal,
          upload encrypted blobs to Walrus, and let authorized users decrypt locally.
        </Text>
        <Separator my="2" size="4" />
        <Link to="/allowlist">
          <Button size="3">Launch</Button>
        </Link>
      </Flex>
    </Card>
  );
}

function App() {
  const currentAccount = useCurrentAccount();
  const [recipientAllowlist, setRecipientAllowlist] = useState<string>('');
  const [capId, setCapId] = useState<string>('');
  return (
    <Container className="page-container">
      <Flex position="sticky" px="4" py="2" justify="between" className="glass-bar" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Heading className="m-4 mb-8 brand-gradient" size="8">Encrypter & Decrypter</Heading>
        {/* <p>TODO: add seal logo</p> */}
        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <Card className="glass-card" style={{ marginBottom: '2rem' }}>
        <Flex direction="column" gap="2">
          <Callout.Root color="amber">
            <Callout.Text>
              Walrus Testnet blobs are retained for 1 epoch by default; older files may not be
              retrievable.
            </Callout.Text>
          </Callout.Root>
          <Text>
            If upload/download to Walrus fails, the public endpoints in your dev config may be down.
            Consider running your own aggregator/publisher or choosing a reliable public provider.
          </Text>
        </Flex>
      </Card>
      {currentAccount ? (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/allowlist/*"
              element={
                <Routes>
                  <Route path="/" element={<CreateAllowlist />} />
                  <Route
                    path="/admin/:id"
                    element={
                      <div>
                        <Allowlist
                          setRecipientAllowlist={setRecipientAllowlist}
                          setCapId={setCapId}
                        />
                        <WalrusUpload
                          policyObject={recipientAllowlist}
                          cap_id={capId}
                          moduleName="allowlist"
                        />
                      </div>
                    }
                  />
                  <Route path="/admin" element={<AllAllowlist />} />
                  <Route
                    path="/view/:id"
                    element={<Feeds suiAddress={currentAccount.address} />}
                  />
                </Routes>
              }
            />
          </Routes>
        </BrowserRouter>
      ) : (
        <p>Please connect your wallet to continue</p>
      )}
    </Container>
  );
}

export default App;
