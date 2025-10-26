import { chromium } from 'playwright';

async function testRecolorPanel() {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging from the page
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning' || text.includes('RECOLOR') || text.includes('Region')) {
      console.log(`PAGE [${type.toUpperCase()}]:`, text);
    }
  });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));

  try {
    console.log('📱 Navigating to http://localhost:3002');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Wait a moment for the app to fully load
    await page.waitForTimeout(2000);

    console.log('📤 Uploading test image...');
    // Upload the PR Flow logo
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./public/pr-flow-logo.png');
    console.log('✅ Image uploaded');
    await page.waitForTimeout(2000); // Wait for image to load

    console.log('🔍 Looking for bottom dock...');
    // The tools are in the bottom dock - it's the 7th button (index 6) for Recolor
    const bottomDock = page.locator('div.fixed.bottom-2').first();
    await bottomDock.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Found bottom dock');

    const allButtons = await bottomDock.locator('button').all();
    console.log(`Found ${allButtons.length} tool buttons in dock`);

    // Recolor is the 7th tool (index 6): validator, upscaler, bg-remover, cropper, downscaler, color-knockout, recolor
    const recolorButton = allButtons[6];
    console.log('✅ Clicking Recolor button (7th tool)...');
    await recolorButton.click();
    await page.waitForTimeout(1500);

    console.log('🖼️ Looking for Pick Color button...');
    const pickColorButton = page.locator('button:has-text("Pick Color")').first();
    if (await pickColorButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Pick Color button, clicking...');
      await pickColorButton.click();
      await page.waitForTimeout(500);

      console.log('🖱️ Looking for image to click on...');
      // Find the preview image
      const previewImage = page.locator('img[alt="Preview"]').first();
      if (await previewImage.isVisible()) {
        console.log('✅ Found preview image, clicking center...');
        const box = await previewImage.boundingBox();
        if (box) {
          console.log(`Image bounds: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
          // Click center of image
          const clickX = box.x + box.width / 2;
          const clickY = box.y + box.height / 2;
          console.log(`Clicking at: x=${clickX}, y=${clickY}`);
          await page.mouse.click(clickX, clickY);
          await page.waitForTimeout(3000); // Wait longer for processing

          console.log('🎨 Checking for color swatches...');

          // Look for the "Original" label
          const originalLabel = page.locator('text=Original').first();
          const originalVisible = await originalLabel.isVisible();
          console.log(`Original label visible: ${originalVisible}`);

          // Look for the color swatch divs
          const colorSwatches = page.locator('div[style*="backgroundColor"]');
          const count = await colorSwatches.count();
          console.log(`Found ${count} elements with backgroundColor style`);

          // Get the actual computed styles
          const swatches = await page.locator('div.h-14.rounded.border-\\[2px\\]').all();
          console.log(`Found ${swatches.length} color swatch divs`);

          for (let i = 0; i < swatches.length; i++) {
            const style = await swatches[i].getAttribute('style');
            const title = await swatches[i].getAttribute('title');
            console.log(`Swatch ${i}: style="${style}", title="${title}"`);
          }

          // Take a screenshot
          await page.screenshot({ path: 'recolor-test.png', fullPage: true });
          console.log('📸 Screenshot saved to recolor-test.png');

          // Check if hex values are displayed
          const hexValues = page.locator('div.font-mono.font-bold');
          const hexCount = await hexValues.count();
          console.log(`Found ${hexCount} hex value displays`);
          for (let i = 0; i < hexCount; i++) {
            const text = await hexValues.nth(i).textContent();
            console.log(`Hex ${i}: "${text}"`);
          }

        } else {
          console.log('❌ Could not get image bounding box');
        }
      } else {
        console.log('❌ Preview image not visible');
      }
    } else {
      console.log('❌ Pick Color button not visible');
    }

    // Keep browser open for inspection
    console.log('⏸️  Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'recolor-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to recolor-error.png');
  } finally {
    await browser.close();
    console.log('✅ Test complete');
  }
}

testRecolorPanel();
