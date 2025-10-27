/**
 * Direct Replicate API Test
 * Tests if the Replicate API key works correctly
 */

import Replicate from 'replicate'

console.log('🧪 Testing Replicate API Integration\n')

// Use API key from .env.local
const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
console.log('API Key present:', !!apiKey)
console.log('API Key starts with r8_:', apiKey?.startsWith('r8_'))
console.log('API Key prefix:', apiKey?.substring(0, 10) + '...\n')

if (!apiKey || !apiKey.startsWith('r8_')) {
  console.error('❌ Invalid or missing REPLICATE_API_KEY')
  process.exit(1)
}

async function testImageEdit() {
  try {
    console.log('📤 Creating Replicate client...')
    const replicate = new Replicate({
      auth: apiKey
    })

    // Use a public test image
    const testImageUrl = 'https://replicate.delivery/pbxt/KMNwIGHzPJUhzGk6EsEwWEGkCDPJzPjg11LsqEj7vHxCzLWIA/astronaut.png'

    console.log('📸 Test image URL:', testImageUrl)
    console.log('✍️  Test prompt: "change the word astronaut to spaceman"')
    console.log('⏳ Calling Replicate API (this may take 10-30 seconds)...\n')

    const startTime = Date.now()

    const output = await replicate.run(
      "qwen/qwen-image-edit-plus",
      {
        input: {
          image: [testImageUrl],  // Model expects an array!
          prompt: "change the word astronaut to spaceman",
          aspect_ratio: 'match_input_image',
          output_format: 'webp',
          output_quality: 95,
          go_fast: true
        }
      }
    )

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('✅ Replicate API call succeeded!')
    console.log('⏱️  Duration:', duration, 'seconds')
    console.log('📦 Output type:', typeof output)
    console.log('📦 Output is array:', Array.isArray(output))
    console.log('🖼️  Result URL:', output)

    if (Array.isArray(output)) {
      console.log('🖼️  First result:', output[0])
    }

    console.log('\n✨ Test completed successfully!')
    console.log('Your Replicate API key is working correctly.')

  } catch (error) {
    console.error('\n❌ Test failed!')
    console.error('Error:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    process.exit(1)
  }
}

testImageEdit()
