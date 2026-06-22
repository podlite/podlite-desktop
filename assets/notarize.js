/* eslint-disable */

const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context

  if (electronPlatformName !== 'darwin') return

  if (process.env.SKIP_NOTARIZATION === 'true') {
    console.log('notarize: skipped (SKIP_NOTARIZATION=true)')
    return
  }

  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') {
    console.log('notarize: skipped (CSC_IDENTITY_AUTO_DISCOVERY=false)')
    return
  }

  const appleApiKey = process.env.APPLE_API_KEY
  const appleApiKeyId = process.env.APPLE_API_KEY_ID
  const appleApiIssuer = process.env.APPLE_API_ISSUER || process.env.APPLE_API_ISSUER_ID
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleApiKey || !appleApiKeyId || !appleApiIssuer) {
    console.warn('notarize: skipped (APPLE_API_KEY / APPLE_API_KEY_ID / APPLE_API_ISSUER not set)')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  console.log(`notarize: submitting ${appPath} via notarytool`)
  await notarize({
    tool: 'notarytool',
    appPath,
    appleApiKey,
    appleApiKeyId,
    appleApiIssuer,
    ...(teamId ? { teamId } : {}),
  })
  console.log('notarize: complete')
}
