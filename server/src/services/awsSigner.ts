import crypto from 'crypto'

interface AwsCredentials {
    accessKeyId: string
    secretAccessKey: string
    region: string
    sessionToken?: string
}

function sha256(message: string | Buffer): string {
    return crypto.createHash('sha256').update(message).digest('hex')
}

function hmac(key: string | Buffer, message: string): Buffer {
    return crypto.createHmac('sha256', key).update(message).digest()
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = hmac(`AWS4${key}`, dateStamp)
    const kRegion = hmac(kDate, regionName)
    const kService = hmac(kRegion, serviceName)
    const kSigning = hmac(kService, 'aws4_request')
    return kSigning
}

/**
 * 簽署 AWS Bedrock API 請求，實作原生 AWS Signature Version 4 (SigV4)
 * 這讓我們能直接用 Axios 呼叫 Bedrock，而不用下載龐大的 AWS SDK
 */
export function signAwsRequest(params: {
    url: string
    method: string
    headers: Record<string, string>
    body: string
    credentials: AwsCredentials
}): Record<string, string> {
    const { url, method, headers, body, credentials } = params
    const { accessKeyId, secretAccessKey, region, sessionToken } = credentials

    const parsedUrl = new URL(url)
    const host = parsedUrl.host
    const path = parsedUrl.pathname
    const service = 'bedrock'

    // 1. 取得日期與時間戳記
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'
    const dateStamp = amzDate.substring(0, 8)

    // 2. 準備 Headers 基礎副本
    const signedHeadersList = ['host', 'x-amz-date']
    const finalHeaders: Record<string, string> = {
        ...headers,
        'host': host,
        'x-amz-date': amzDate
    }

    if (sessionToken) {
        finalHeaders['x-amz-security-token'] = sessionToken
        signedHeadersList.push('x-amz-security-token')
    }

    // 排序 Signed Headers
    signedHeadersList.sort()
    const canonicalHeaders = signedHeadersList
        .map(h => `${h}:${finalHeaders[h].trim()}`)
        .join('\n') + '\n'

    const signedHeaders = signedHeadersList.join(';')

    // 3. 建立 Canonical Request 規範請求
    const payloadHash = sha256(body || '')
    const canonicalRequest = [
        method.toUpperCase(),
        path,
        '', // Query string (Bedrock 通常為空)
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n')

    // 4. 建立 String to Sign 待簽署字串
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256(canonicalRequest)
    ].join('\n')

    // 5. 計算 Signature 簽章
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service)
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex')

    // 6. 組合 Authorization Header
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    
    finalHeaders['Authorization'] = authorizationHeader

    return finalHeaders
}
