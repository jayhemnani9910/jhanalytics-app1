import { test, expect } from '@playwright/test';

test.describe('Tailor App E2E Driving Scenario', () => {
  test.beforeAll(async () => {
    // Hermetic setup: Clear Firestore and Auth emulator states
    // 1. Clear Firestore database
    await fetch('http://127.0.0.1:8080/emulator/v1/projects/mock-project-id/databases/(default)/documents', {
      method: 'DELETE',
    });

    // 2. Clear Auth users
    await fetch('http://127.0.0.1:9099/emulator/v1/projects/mock-project-id/accounts', {
      method: 'DELETE',
    });

    // 3. Create mock shop user "shop@example.com" with password "password123"
    const signUpResponse = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=mock-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'shop@example.com',
        password: 'password123',
        returnSecureToken: true,
      }),
    });

    if (!signUpResponse.ok) {
      const resText = await signUpResponse.text();
      if (!resText.includes('EMAIL_EXISTS')) {
        throw new Error(`Failed to create test user: ${resText}`);
      }
    }
  });

  test('complete tailor shop workflow', async ({ page }) => {
    // 1. Visit Login screen and log in
    await page.goto('/');
    await expect(page.locator('#login-email')).toBeVisible();
    
    await page.fill('#login-email', 'shop@example.com');
    await page.fill('#login-password', 'password123');
    await page.click('#login-submit');

    // Expect to be authenticated and redirect to dashboard (Home)
    await expect(page.locator('#bottom-tab-bar')).toBeVisible();
    await expect(page.locator('text=Home')).toBeVisible();

    // Wait for initial database seeding to complete
    await page.waitForTimeout(2000);

    // 2. Navigate to Customers page and create customer "Meena Patel"
    await page.click('#bottom-tab-bar >> text=Customers');
    await expect(page.locator('h1:has-text("Customers")')).toBeVisible();

    // Click "Add Customer" button
    await page.click('button:has-text("Add Customer")');
    await expect(page.locator('h2:has-text("Add Customer")')).toBeVisible();

    // Fill customer form
    await page.fill('input[placeholder="e.g., Ramesh Patel"]', 'Meena Patel');
    await page.fill('input[placeholder="e.g., 9876543210"]', '9988776655');
    await page.click('button:has-text("Female")');
    await page.fill('textarea[placeholder="e.g., standard sizing, prefers loose neck"]', 'Prefers loose fitting');
    
    // Save customer
    await page.click('button:has-text("Save")');
    
    // Verify customer is in the list
    await expect(page.locator('text=Meena Patel')).toBeVisible();
    await expect(page.locator('text=9988776655')).toBeVisible();

    // 3. Click customer to open details and start a new order
    await page.click('text=Meena Patel');
    await expect(page.locator('h1:has-text("Meena Patel")')).toBeVisible();
    await expect(page.locator('text=Prefers loose fitting')).toBeVisible();

    // Start a new order
    await page.click('button:has-text("New order")');
    await expect(page.locator('h1:has-text("New Order")')).toBeVisible();

    // 4. Fill Order Editor
    // Set deadline to tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const deadlineStr = `${yyyy}-${mm}-${dd}`;

    await page.fill('input[type="date"]', deadlineStr);

    // Set advance payment: ₹500 (this is the 1st input[type="number"] on the page)
    await page.fill('input[type="number"] >> nth=0', '500');

    // Set order notes
    await page.fill('textarea[placeholder="Order-level instructions..."]', 'Urgent wedding wear');

    // Add Garment Item 1: Blouse (₹600)
    await page.click('button:has-text("Add Garment Item")');
    await page.selectOption('select >> nth=1', { label: 'Blouse (Female)' });
    await page.fill('input[type="number"] >> nth=2', '600'); // Garment 1 price is the 3rd number input (Advance is 1st, Qty is 2nd)
    
    // Enter Blouse measurements
    // Fill first two measurements: Shoulder -> 14, Bust/Chest -> 36
    await page.fill('input[placeholder="e.g. 38½, loose"] >> nth=0', '14');
    await page.fill('input[placeholder="e.g. 38½, loose"] >> nth=1', '36');

    // Add Garment Item 2: Kameez / Kurti (₹800)
    await page.click('button:has-text("Add Garment Item")');
    // For 2nd garment, template dropdown is select index 2
    await page.selectOption('select >> nth=2', { label: 'Kameez / Kurti (Female)' });
    await page.fill('input[type="number"] >> nth=4', '800'); // Garment 2 price is the 5th number input (Advance=0, G1 Qty=1, G1 Price=2, G2 Qty=3, G2 Price=4)

    // Enter Kameez measurements
    // Kameez Length is index 10 (since Blouse has 10 fields indices 0-9)
    await page.fill('input[placeholder="e.g. 38½, loose"] >> nth=10', '40');
    // Chest (round) is index 12 (3rd field in Kameez fields: Kameez Length=10, Shoulder=11, Chest=12)
    await page.fill('input[placeholder="e.g. 38½, loose"] >> nth=12', '36');

    // Save order
    await page.click('button[type="submit"]');

    // Expect to return to Customer Details page and list the new order
    await expect(page.locator('h1:has-text("Meena Patel")')).toBeVisible();
    await expect(page.locator('text=Order History')).toBeVisible();

    // Verify token, total bill, and balance due show up
    // Order total is ₹1400 (600 + 800) and balance is ₹900 (1400 - 500)
    await expect(page.locator('text=₹1400')).toBeVisible();
    await expect(page.locator('text=₹900')).toBeVisible();

    // Grab the 4-digit token
    const tokenText = await page.locator('span:has-text("TOKEN") + span').textContent();
    expect(tokenText).toMatch(/^\d{4}$/);

    // 5. Verify order shows up on Home (Dashboard) in the "Due soon" section
    await page.click('#bottom-tab-bar >> text=Home');
    await expect(page.locator('h1:has-text("Pareshbhai Tailor")')).toBeVisible();
    
    // Assert Meena Patel is listed in "Due soon"
    const dueSoonSection = page.locator('[data-testid="section-due-soon"]');
    await expect(dueSoonSection.locator(`text=Meena Patel`).first()).toBeVisible();
    await expect(dueSoonSection.locator(`text=#${tokenText}`)).toBeVisible();

    // 6. Test search on Orders list screen by name and token
    await page.click('#bottom-tab-bar >> text=Orders');
    await expect(page.locator('h1:has-text("Orders")')).toBeVisible();

    // Search by name "Meena"
    await page.fill('input[placeholder="Search name, phone, token..."]', 'Meena');
    await expect(page.locator(`text=#${tokenText}`)).toBeVisible();

    // Search by token
    await page.fill('input[placeholder="Search name, phone, token..."]', tokenText!);
    await expect(page.locator('text=Meena Patel')).toBeVisible();

    // Search by a dummy token (no matches)
    await page.fill('input[placeholder="Search name, phone, token..."]', '99999');
    await expect(page.locator('text=No orders found.')).toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Search name, phone, token..."]', '');

    // 7. Click order to go to details and transition status
    await page.click(`text=#${tokenText}`);
    await expect(page.locator('h1:has-text("Order Details")')).toBeVisible();
    await expect(page.locator(`h2:has-text("#${tokenText}")`)).toBeVisible();

    // Transition Blouse status to "Ready"
    const blouseCard = page.locator('[data-testid="garment-card-Blouse"]');
    await blouseCard.locator('button:has-text("Ready")').click();
    // Stepper button for active "Ready" will update style
    await expect(blouseCard.locator('button:has-text("Ready")')).toHaveCSS('background-color', 'rgb(139, 92, 246)'); // Purple

    // Global order status rollup should still be "Pending" because Kameez is still "Pending"
    await expect(page.locator('span:has-text("Pending")')).toBeVisible();

    // Transition Kameez to "Ready"
    const kameezCard = page.locator('[data-testid="garment-card-Kameez / Kurti"]');
    await kameezCard.locator('button:has-text("Ready")').click();
    await expect(kameezCard.locator('button:has-text("Ready")')).toHaveCSS('background-color', 'rgb(139, 92, 246)');

    // Global order status rollup should update to "Ready"
    await expect(page.locator('span:has-text("Ready")')).toBeVisible();

    // Verify Home (Dashboard) shows order in "Ready for pickup" section
    await page.click('#bottom-tab-bar >> text=Home');
    const readySection = page.locator('[data-testid="section-ready"]');
    await expect(readySection.locator(`text=Meena Patel`).first()).toBeVisible();

    // Go back to order details (via clicking the card)
    await page.click(`text=#${tokenText}`);
    
    // Transition both to "Delivered"
    await page.locator('[data-testid="garment-card-Blouse"] button:has-text("Delivered")').click();
    // Wait for Blouse state update to complete and reflect in UI to prevent concurrent write race conditions on same doc
    await expect(page.locator('[data-testid="garment-card-Blouse"] button:has-text("Delivered")')).toHaveCSS('background-color', 'rgb(16, 185, 129)');

    await page.locator('[data-testid="garment-card-Kameez / Kurti"] button:has-text("Delivered")').click();

    // Global status rollup is "Delivered"
    await expect(page.locator('span:has-text("Delivered")')).toBeVisible();

    // 8. Go to Home, confirm it's out of "Due soon" and "Ready" but lists in "Balance due"
    await page.click('#bottom-tab-bar >> text=Home');
    
    // Verify it is not in "Due soon" or "Ready for pickup" lists
    const dueSoonSectionEmpty = page.locator('[data-testid="section-due-soon"]');
    await expect(dueSoonSectionEmpty.locator(`text=Meena Patel`)).not.toBeVisible();
    const readySectionEmpty = page.locator('[data-testid="section-ready"]');
    await expect(readySectionEmpty.locator(`text=Meena Patel`)).not.toBeVisible();

    // Verify it lists in "Balance due" section because of the ₹900 balance
    const balanceDueSection = page.locator('[data-testid="section-balance-due"]');
    await expect(balanceDueSection.locator(`text=Meena Patel`).first()).toBeVisible();
    await expect(balanceDueSection.locator(`text=₹900`)).toBeVisible();

    // 9. Go to Settings, toggle language to Gujarati, and verify text changes
    await page.click('#bottom-tab-bar >> text=Settings');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();

    // Click Gujarati toggle
    await page.click('button:has-text("ગુજરાતી (Gujarati)")');

    // Verify Tab Bar and screen title updates to Gujarati
    await expect(page.locator('#bottom-tab-bar >> text=સેટિંગ')).toBeVisible();
    await expect(page.locator('h1:has-text("સેટિંગ")')).toBeVisible();

    // Go to Home and verify home headers translate
    await page.click('#bottom-tab-bar >> text=હોમ');
    await expect(page.locator('#bottom-tab-bar >> text=હોમ')).toBeVisible();
    await expect(page.locator('[data-testid="section-balance-due"] h2')).toHaveText('બાકી રકમ'); // Balance due in Gujarati

    // Toggle back to English
    await page.click('#bottom-tab-bar >> text=સેટિંગ');
    await page.click('button:has-text("English")');
    await expect(page.locator('#bottom-tab-bar >> text=Settings')).toBeVisible();
  });
});
