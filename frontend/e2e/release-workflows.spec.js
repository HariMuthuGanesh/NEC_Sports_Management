import { test, expect } from '@playwright/test';

async function session(page, role, nav, overrides = {}) {
  await page.addInitScript(({role,nav}) => {
    if (!localStorage.getItem('test_initialized')) {
      localStorage.setItem('nec_sports_auth_user',JSON.stringify({id:1,role,name:'Test User',dept:'All'}));
      sessionStorage.setItem('nec_sports_active_nav',nav);
      localStorage.setItem('test_initialized','1');
    }
  }, {role,nav});
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/api/')) return route.continue();
    const path = pathname.replace('/api','');
    if (overrides[path]) return overrides[path](route);
    let data = [];
    if (path.endsWith('/csrf-token')) data = {csrfToken:'test-csrf'};
    if (path==='/auth/me') data = {id:1,role,name:'Test User',dept:'All'};
    if (path==='/stats/overview') data = {};
    if (path==='/my-squad') data = {members:[],assignments:[]};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto('/');
}

test('logout sends CSRF and stays logged out after refresh even with a stale cookie', async ({page}) => {
  let logoutHeaders;
  await session(page,'Admin','admin_teams',{
    '/auth/logout': async route => { logoutHeaders=route.request().headers(); await route.fulfill({json:{success:true}}); }
  });
  const signOut = page.getByRole('button',{name:/log out/i}).first();
  await expect(signOut).toBeVisible();
  await signOut.click();
  await expect.poll(()=>logoutHeaders?.['x-csrf-token']).toBe('test-csrf');
  await page.reload();
  await expect(page.getByRole('button',{name:/log out/i})).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('nec_sports_auth_user'))).toBe(null);
});

test('president can open cross-department teams without system administration navigation',async ({page})=>{
  await session(page,'Sports President','admin_teams');
  await expect(page.getByRole('heading',{name:/team/i}).first()).toBeVisible();
  await expect(page.locator('.nec-nav-item').filter({hasText:'Security Audit'})).toHaveCount(0);
  await expect(page.locator('.nec-nav-item').filter({hasText:'Staff Coordinators'})).toHaveCount(0);
  await expect(page.getByText('Access Restricted',{exact:true})).toHaveCount(0);
});

test('score updater sees scheduled matches without start or score editing',async ({page})=>{
  await session(page,'Score Updater','coord_score_entry',{
    '/matches':route=>route.fulfill({json:{success:true,data:[{id:1,sport:'Football',teamA:'CSE',teamB:'ECE',status:'Scheduled',scheduled_time:'2027-01-01T10:00:00',scoreA:0,scoreB:0}]}})
  });
  await expect(page.locator('.nec-ssb-card').first()).toBeVisible();
  await expect(page.getByRole('button',{name:/start match/i})).toHaveCount(0);
  await page.locator('.nec-ssb-card').first().click();
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('nec_sports_active_nav'))).toBe('coord_score_entry');
  await expect(page.getByText('Update Score',{exact:true})).toHaveCount(0);
});

test('sports actions use icons with concise hover labels',async ({page})=>{
  await session(page,'Admin','admin_sports',{
    '/sports':route=>route.fulfill({json:{success:true,data:[{sport_id:1,name:'Football',category:'Open',sport_type:'Team',min_players:7,max_players:11}]}})
  });
  const remove=page.getByRole('button',{name:'Delete sport',exact:true});
  await expect(remove).toBeVisible();
  await expect(remove).toHaveAttribute('title','Delete');
  await expect(remove).toHaveText('');
  await expect(remove.locator('svg')).toHaveCount(1);
});

test('admin creates a relay competition with its category and squad size',async ({page})=>{
  let submitted;
  await session(page,'Admin','event_competitions',{
    '/events':route=>route.fulfill({json:{success:true,data:[{event_id:1,name:'Athletics Meet',sport_id:2,tournament_id:1}]}}),
    '/sports/2/categories':route=>route.fulfill({json:{success:true,data:[{category_id:3,name:'4 x 100m'}]}}),
    '/competitions':async route=>{
      if(route.request().method()==='POST') submitted=route.request().postDataJSON();
      await route.fulfill({json:{success:true,data:route.request().method()==='POST'?{competition_id:1}:[]}});
    }
  });
  await page.getByRole('button',{name:'Create',exact:true}).click();
  await page.getByRole('combobox',{name:'Event',exact:true}).selectOption('1');
  await page.getByRole('combobox',{name:'Category',exact:true}).selectOption('3');
  await page.getByLabel('Name',{exact:true}).fill('Relay Final');
  await page.getByLabel(/Athletes per entry/).fill('4');
  await page.getByLabel('Scheduled',{exact:true}).fill('2027-01-01T09:00');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(()=>submitted?.entrySize).toBe(4);
  expect(submitted.categoryId).toBe('3');
  expect(submitted.scoring).toBe('Time');
});

test('captain attendance opens with saved coordinator markings',async ({page})=>{
  await session(page,'Captain','coord_attendance',{
    '/teams':route=>route.fulfill({json:{success:true,data:[{id:1,name:'CSE Football',deptCode:'CSE',deptId:1}]}}),
    '/teams/1/players':route=>route.fulfill({json:{success:true,data:[{id:1,student_id:1,name:'Player One'}]}}),
    '/matches':route=>route.fulfill({json:{success:true,data:[{id:1,team_a_id:1,team_b_id:2,teamA:'CSE',teamB:'ECE'}]}}),
    '/teams/1/attendance':route=>route.fulfill({json:{success:true,data:[{match_id:1,student_id:1,status:'Absent'}]}})
  });
  await page.locator('#attendance-match').selectOption('1');
  await expect(page.getByText('Present: 0 / 1 Athletes',{exact:true})).toBeVisible();
});
