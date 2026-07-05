export async function copyImageToClipboard(imageUrl: string): Promise<void> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const type = blob.type || 'image/png'
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })])
}
