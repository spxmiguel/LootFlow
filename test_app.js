import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/miguelramthunmoretti/.gemini/antigravity-cli/brain/c132c6bc-262a-4d38-a669-ea8885d25a76/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  await page.setViewport({ width: 1280, height: 800 });

  // Intercept and mock Steam requests
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('steamcommunity.com/market/search/render/')) {
      console.log('Intercepted Steam search API request. Returning mock response...');
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: [
            {
              name: 'Chroma 3 Case',
              hash_name: 'Chroma 3 Case',
              sell_listings: 12000,
              sell_price_text: 'R$ 15,50',
              asset_description: {
                icon_url: '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKxGgYDFoBnr48ptbYEC8i3Yk0569xd13dxY6sL-l14_cNK-g8-72NPA-H5N-G2BwkuMRdeL_awcr31wK6P7HwhA39C6BwXy-26YgBv4g',
              }
            }
          ]
        })
      });
    } else if (url.includes('steamcommunity.com/market/priceoverview/')) {
      console.log('Intercepted Steam price API request. Returning mock response...');
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          lowest_price: 'R$ 15,50',
          median_price: 'R$ 15,00',
        })
      });
    } else {
      request.continue();
    }
  });

  // Collect console and page errors
  const errors = [];
  const logs = [];
  page.on('pageerror', (err) => {
    console.error('Page Error:', err.message);
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });
  page.on('console', (msg) => {
    const text = msg.text();
    console.log('Console:', msg.type(), text);
    logs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      errors.push({ type: 'console-error', message: text });
    }
  });

  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Take screenshot of Login page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });
    console.log('Saved login page screenshot.');

    // Look for "Entrar como Visitante" button
    // It's a button with text "Entrar como Visitante"
    const buttons = await page.$$('button');
    let visitorBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Entrar como Visitante') || text.includes('Visitante')) {
        visitorBtn = btn;
        break;
      }
    }

    if (visitorBtn) {
      console.log('Clicking visitor button...');
      await visitorBtn.click();
      await page.waitForTimeout(2500);
    } else {
      console.log('Visitor button not found. Maybe already logged in? Checking main layout...');
    }

    // Capture Dashboard
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_dashboard.png') });
    console.log('Saved dashboard screenshot.');

    // Helper to navigate to a page by checking sidebar button texts
    const navigateTo = async (tabNamePT, tabNameEN, screenshotName) => {
      console.log(`Navigating to ${tabNamePT}/${tabNameEN}...`);
      const navButtons = await page.$$('nav button');
      let targetBtn = null;
      for (const btn of navButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.toLowerCase().includes(tabNamePT.toLowerCase()) || text.toLowerCase().includes(tabNameEN.toLowerCase())) {
          targetBtn = btn;
          break;
        }
      }
      if (targetBtn) {
        await targetBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName) });
        console.log(`Saved screenshot: ${screenshotName}`);
      } else {
        console.warn(`Could not find nav button for ${tabNamePT}/${tabNameEN}`);
      }
    };

    // Nav to Contas (Accounts)
    await navigateTo('Contas', 'Accounts', '03_accounts.png');

    // Add a new account
    console.log('Attempting to add a new account...');
    // Look for the "Nova Conta" button
    const actionBtns = await page.$$('button');
    let addAccountBtn = null;
    for (const btn of actionBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Nova Conta') || text.includes('New Account') || text.includes('Adicionar Conta')) {
        addAccountBtn = btn;
        break;
      }
    }

    if (addAccountBtn) {
      console.log('Clicking New Account button to open modal...');
      await addAccountBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_add_account_modal.png') });

      // Fill form
      // The name input should be typed using its unique placeholder
      const nameInput = await page.$('input[placeholder="ex: Conta Prime 1"]');
      if (nameInput) {
        await nameInput.type('Conta Teste Antigravity');
      } else {
        console.warn('nameInput was not found!');
      }
      const descInput = await page.$('input[placeholder="76561198..."]');
      if (descInput) {
        await descInput.type('76561198000000000');
      } else {
        console.warn('descInput was not found!');
      }

      // Log typed values
      if (nameInput && descInput) {
        const nameVal = await page.evaluate(el => el.value, nameInput);
        const descVal = await page.evaluate(el => el.value, descInput);
        console.log('Typed values in modal:', { nameVal, descVal });
      }

      // Find submit/salvar button inside the modal footer
      const modalBtns = await page.$$('div.border-t button');
      let saveBtn = null;
      for (const btn of modalBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Salvar') || text.includes('Save') || text.includes('Criar') || text.includes('Adicionar')) {
          // Let's filter out close buttons
          if (!text.includes('Cancelar') && !text.includes('Cancel')) {
            saveBtn = btn;
            break;
          }
        }
      }

      if (saveBtn) {
        console.log('Clicking Save account button...');
        await saveBtn.click();
        await page.waitForTimeout(1500);
        const textAfterSave = await page.evaluate(() => document.body.innerText);
        console.log('--- POST-SAVE PAGE TEXT ---');
        console.log(textAfterSave);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_accounts_after_add.png') });
      } else {
        console.warn('Save account button not found in modal');
      }
    }

    // Nav to Drops
    await navigateTo('Drops', 'Drops', '04_drops.png');

    // Register a drop
    console.log('Attempting to register a drop...');
    const allBtns = await page.$$('button');
    let registerDropBtn = null;
    for (const btn of allBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Registrar Drop') || text.includes('Register Drop') || text.includes('Novo Drop') || text.includes('Registrar')) {
        registerDropBtn = btn;
        break;
      }
    }

    if (registerDropBtn) {
      console.log('Clicking Register Drop button...');
      await registerDropBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_register_drop_modal.png') });

      // Log inputs and buttons for debugging
      const inputPlaceholders = await page.$$eval('input', el => el.map(i => i.placeholder));
      const buttonTexts = await page.$$eval('button', el => el.map(b => b.textContent));
      console.log('--- DROP MODAL DEBUG ---');
      console.log('Available input placeholders:', inputPlaceholders);
      console.log('Available button texts:', buttonTexts);

      // Fill in drop item name
      const searchItemInput = await page.$('input[placeholder*="Buscar item"], input[placeholder*="Search item"], input[placeholder*="Pesquisar"]');
      if (searchItemInput) {
        console.log('Found searchItemInput. Typing "Case"...');
        await searchItemInput.type('Case');
        await page.waitForTimeout(1500);

        const suggestions = await page.$$('div.absolute button, div.z-50 button, button');
        const suggTexts = [];
        for (const s of suggestions) {
          suggTexts.push(await page.evaluate(el => el.textContent, s));
        }
        console.log('Suggestions found:', suggTexts);

        // Click the first suggestion containing "Case" or the first suggestion in general
        let clickIndex = -1;
        for (let i = 0; i < suggTexts.length; i++) {
          if (suggTexts[i].toLowerCase().includes('case')) {
            clickIndex = i;
            break;
          }
        }
        if (clickIndex === -1 && suggestions.length > 0) clickIndex = 0;

        if (clickIndex !== -1) {
          console.log(`Clicking autocomplete suggestion index ${clickIndex} ("${suggTexts[clickIndex]}")...`);
          await suggestions[clickIndex].click();
          await page.waitForTimeout(1000);
        } else {
          console.warn('No autocomplete suggestions found in dropdown!');
        }
      } else {
        console.warn('searchItemInput was NOT found!');
      }

      // Check if price/value input exists and fill it
      const priceInput = await page.$('input[type="number"], input[placeholder*="0,00"], input[placeholder*="Price"]');
      if (priceInput) {
        await priceInput.click({ clickCount: 3 }); // select all
        await priceInput.type('15.50');
      }

      // Save drop inside the modal footer
      const dropModalBtns = await page.$$('div.border-t button');
      let saveDropBtn = null;
      for (const btn of dropModalBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Salvar') || text.includes('Save') || text.includes('Registrar')) {
          if (!text.includes('Cancelar') && !text.includes('Cancel') && !text.includes('Registrar Drops')) {
            saveDropBtn = btn;
            break;
          }
        }
      }

      if (saveDropBtn) {
        console.log('Saving drop...');
        await saveDropBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_drops_after_add.png') });
      } else {
        console.warn('Save drop button not found in modal');
      }
    }

    // Nav to Analytics
    await navigateTo('Dados', 'Analytics', '05_analytics.png');

    // Nav to Goals
    await navigateTo('Metas', 'Goals', '06_goals.png');

    // Create a Goal
    console.log('Attempting to create a goal...');
    const allBtns2 = await page.$$('button');
    let createGoalBtn = null;
    for (const btn of allBtns2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Nova Meta') || text.includes('New Goal') || text.includes('Adicionar Meta')) {
        createGoalBtn = btn;
        break;
      }
    }

    if (createGoalBtn) {
      console.log('Clicking New Goal button...');
      await createGoalBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_new_goal_modal.png') });

      // Type title and value in a robust way
      const inputs = await page.$$('input');
      let nameInput = null;
      let goalValueInput = null;
      for (const input of inputs) {
        const placeholder = await page.evaluate(el => el.placeholder, input);
        console.log(`Found input with placeholder: "${placeholder}"`);
        if ((placeholder.toLowerCase().includes('bayonet') || placeholder.toLowerCase().includes('doppler')) && 
            !placeholder.toLowerCase().includes('buscar') && 
            !placeholder.toLowerCase().includes('search') &&
            !placeholder.toLowerCase().includes('item')) {
          nameInput = input;
        } else if (placeholder.toLowerCase().includes('500') || placeholder.toLowerCase().includes('0,00') || placeholder.toLowerCase().includes('target')) {
          goalValueInput = input;
        }
      }

      if (nameInput) {
        await nameInput.type('Meta de Skins de Teste');
      } else {
        console.warn('Could not find goal name input!');
      }

      if (goalValueInput) {
        await goalValueInput.click({ clickCount: 3 });
        await goalValueInput.type('500');
      } else {
        console.warn('Could not find goal target value input!');
      }

      // Save goal inside the modal footer
      const goalModalBtns = await page.$$('div.border-t button');
      let saveGoalBtn = null;
      for (const btn of goalModalBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Criar') || text.includes('Salvar') || text.includes('Save') || text.includes('Create')) {
          if (!text.includes('Cancelar') && !text.includes('Cancel')) {
            saveGoalBtn = btn;
            break;
          }
        }
      }

      if (saveGoalBtn) {
        console.log('Saving goal...');
        await saveGoalBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_goals_after_add.png') });
      } else {
        console.warn('Save goal button not found in modal');
      }
    }

    // Nav to Settings
    await navigateTo('Configurações', 'Settings', '07_settings.png');
    await page.waitForTimeout(2000);

    // Go to Appearance Tab in Settings
    console.log('Clicking Aparência tab...');
    let settingsTabs = await page.$$('button');
    let appearanceTabBtn = null;
    for (const btn of settingsTabs) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Aparência') || text.includes('Appearance')) {
        appearanceTabBtn = btn;
        break;
      }
    }

    if (appearanceTabBtn) {
      await appearanceTabBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_settings_appearance.png') });
      console.log('Saved appearance settings screenshot.');

      // Click EN language button
      const langBtns = await page.$$('button');
      let enBtn = null;
      for (const btn of langBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('EN')) {
          enBtn = btn;
          break;
        }
      }
      if (enBtn) {
        console.log('Clicking EN language button...');
        await enBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_settings_appearance_en.png') });
      }
    }

    // Go to Finance tab in Settings
    console.log('Checking Finance tab...');
    settingsTabs = await page.$$('button');
    let financeTabBtn = null;
    for (const btn of settingsTabs) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Financeiro') || text.includes('Finance')) {
        financeTabBtn = btn;
        break;
      }
    }
    if (financeTabBtn) {
      await financeTabBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_settings_finance.png') });
      console.log('Saved finance settings screenshot.');
    }

    // Return to Dashboard
    await navigateTo('Home', 'Dashboard', '08_dashboard_final.png');

  } catch (error) {
    console.error('Testing crashed:', error);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }

  // Report errors
  console.log('\n--- TEST AUDIT RESULTS ---');
  console.log('Total Console Logs:', logs.length);
  console.log('Total Errors Found:', errors.length);
  if (errors.length > 0) {
    console.log('ERRORS LIST:');
    console.log(JSON.stringify(errors, null, 2));
  } else {
    console.log('No console errors or unhandled exceptions detected!');
  }
}

// Helper wait function definition removed

run();
