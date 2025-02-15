import { test, expect } from 'playwright-test-coverage';

test('pages', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  expect(await page.title()).toBe('JWT Pizza');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('link', { name: 'about', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('link', { name: 'history', exact: true })).toBeVisible();

  await page.getByRole('contentinfo').getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('link', { name: 'franchise-dashboard' })).toBeVisible();
});

test('register', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('Test');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Logout');
});

test('login', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Logout');
});

test('purchase with login', async ({ page }) => {
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route('*/**/api/franchise', async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: 'LotaPizza',
        stores: [
          { id: 4, name: 'Lehi' },
          { id: 5, name: 'Springville' },
          { id: 6, name: 'American Fork' },
        ],
      },
      { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
      { id: 4, name: 'topSpot', stores: [] },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/order', async (route) => {
    const orderReq = {
      items: [
        { menuId: 1, description: 'Veggie', price: 0.0038 },
        { menuId: 2, description: 'Pepperoni', price: 0.0042 },
      ],
      storeId: '4',
      franchiseId: 2,
    };
    const orderRes = {
      order: {
        items: [
          { menuId: 1, description: 'Veggie', price: 0.0038 },
          { menuId: 2, description: 'Pepperoni', price: 0.0042 },
        ],
        storeId: '4',
        franchiseId: 2,
        id: 23,
      },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: orderRes });
  });

  await page.goto('http://localhost:5173/');

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Check balance
  await expect(page.getByText('0.008')).toBeVisible();
});

test('franchisee', async ({ page }) => {
  let created = false;
  await page.goto('http://localhost:5173/');

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'f@jwt.com', password: 'franchisee' };
    const loginRes = { user: { id: 3, name: 'pizza franchisee', email: 'f@jwt.com', roles: [{ role: 'diner' },{ objectId: 1, role: "franchisee" }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/franchise/3', async (route) => {
    const getRes = [{ id: 1, name: "pizzaPocket", admins: [{ id: 3, name: "pizza franchisee", email: "f@jwt.com"}], stores: [{ id: 1, name: "SLC", totalRevenue: 0.008 }]}];
    const postRes = [{ id: 1, name: "pizzaPocket", admins: [{ id: 3, name: "pizza franchisee", email: "f@jwt.com"}], stores: [{ id: 1, name: "SLC", totalRevenue: 0.008 }, { id: 31, name: "Test Store", totalRevenue: 0 }]}];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: (created ? postRes : getRes) });
  });

  await page.route('*/**/api/franchise/1/store', async (route) => {
    const createReq = { name: "Test Store" };
    const createRes = { id: 31, franchiseId: 1, name: "Test Store" };
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(createReq);
    await route.fulfill({ json: createRes });
  });

  await page.route('*/**/api/franchise/1/store/31', async (route) => {
    const createRes = { message: "store deleted" };
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ json: createRes });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Logout');
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('button', { name: 'Create store' })).toBeVisible();

  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('textbox', { name: 'store name' }).click();
  await page.getByRole('textbox', { name: 'store name' }).fill('Test Store');
  created = true;
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('cell', { name: 'Test Store' })).toBeVisible();
  await expect(page.locator('tbody')).toContainText('Test Store');

  await page.getByRole('row', { name: 'Test Store 0 ₿ Close' }).getByRole('button').click();
  await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('tbody')).toContainText('Test Store');
  await page.getByRole('row', { name: 'Test Store 0 ₿ Close' }).getByRole('button').click();
  created = false;
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('tbody')).not.toContainText('Test Store');
});

test('admin', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  let created = false;

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'a@jwt.com', password: 'admin' };
    const loginRes = { user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/franchise', async (route) => {
    const createReq = { stores: [], id: "", name: "Test", admins: [{ email: "f@jwt.com" }] };
    const createRes = [{ id: 52, name: "Test", admins: [{ id: 3, name: "pizza franchisee", email: "f@jwt.com" }], stores: [] }];

    let testedPath = false;
    if (route.request().method() === 'GET') {
      testedPath = true;
    }
    else if (route.request().method() === 'POST') {
      testedPath = true;
      expect(route.request().postDataJSON()).toMatchObject(createReq);
    }
    expect(testedPath).toBe(true);

    await route.fulfill({ json: (created ? createRes : [] ) });
  });

  await page.route('*/**/api/franchise/52', async (route) => {
    const deleteRes = { message: 'franchise deleted' };
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ json: deleteRes });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Admin');
  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.getByRole('link', { name: 'admin-dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await expect(page.getByRole('heading')).toContainText('Create franchise');
  await page.getByRole('textbox', { name: 'franchise name' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('Test');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).click();
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
  created = true;
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('table')).toContainText('Test');

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).toContainText('franchise? This will close all associated stores and cannot be restored. All outstanding revenue will not be refunded.');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('tbody')).toContainText('Test');
  await page.getByRole('button', { name: 'Close' }).click();
  created = false;
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('table')).not.toContainText('Test');
});