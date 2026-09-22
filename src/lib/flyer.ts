import { Asset } from 'expo-asset'
import * as MediaLibrary from 'expo-media-library'

export const FLYER_ASSET_REQUIRE = require('../../assets/flyer-generic.png')

export const FLYER_LANDING_URL = 'https://dinheiroemmao.com'

export const FLYER_PHOTO_BUCKET = 'flyer-photos'

export const FLYER_SETTINGS_DEFAULTS = {
  bonusKz: 700,
  proximityM: 200,
  viewsUnlock: 30,
} as const

export async function getFlyerAssetUri(): Promise<string> {
  const asset = Asset.fromModule(FLYER_ASSET_REQUIRE)
  if (!asset.localUri) {
    await asset.downloadAsync()
  }
  return asset.localUri ?? asset.uri
}

export async function saveFlyerToLibrary(): Promise<void> {
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Permissão da galeria negada')
  }
  const uri = await getFlyerAssetUri()
  await MediaLibrary.saveToLibraryAsync(uri)
}