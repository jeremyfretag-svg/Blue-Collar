import * as NodeVault from 'node-vault';

const vault = new NodeVault({
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN,
});

export async function getSecret(path: string): Promise<Record<string, string>> {
  try {
    const secret = await vault.read(`kv/data/bluecollar/${path}`);
    return secret.data.data;
  } catch (error) {
    console.error(`Failed to retrieve secret: ${path}`, error);
    throw error;
  }
}

export async function setSecret(path: string, data: Record<string, string>): Promise<void> {
  try {
    await vault.write(`kv/data/bluecollar/${path}`, { data });
  } catch (error) {
    console.error(`Failed to set secret: ${path}`, error);
    throw error;
  }
}

export async function rotateSecret(path: string, newData: Record<string, string>): Promise<void> {
  try {
    await setSecret(path, newData);
    console.log(`Secret rotated: ${path}`);
  } catch (error) {
    console.error(`Failed to rotate secret: ${path}`, error);
    throw error;
  }
}

export async function deleteSecret(path: string): Promise<void> {
  try {
    await vault.delete(`kv/data/bluecollar/${path}`);
    console.log(`Secret deleted: ${path}`);
  } catch (error) {
    console.error(`Failed to delete secret: ${path}`, error);
    throw error;
  }
}

export async function listSecrets(path: string): Promise<string[]> {
  try {
    const result = await vault.list(`kv/metadata/bluecollar/${path}`);
    return result.data.keys;
  } catch (error) {
    console.error(`Failed to list secrets: ${path}`, error);
    throw error;
  }
}
