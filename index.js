require('dotenv').config();
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { SheetDatabase } = require('sheets-database');
const fs = require('fs');

const db = new SheetDatabase(process.env._ID);

const getData = async () => {
  try {
    const site_ = process.env.site_;
    let uniqueId = parseInt(process.env.uniqueId, 10);
    const browser = await puppeteer.launch({ headless: true });

    await db.useServiceAccount({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/gm, '\n'),
    });

    // add a new table
    const table = await db.addTable(`entries_${process.env.COUNT}`, [
      'uniqueId',
      'owner_name',
      'ward_number',
      'zone_number',
      'locality',
      'colony_data',
      'mobile_number',
      'email_address',
    ]);

    for (let index = 0; index < 700; index++) {
      const site_url = `${site_}${uniqueId}#`;
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(0);
      await page.setDefaultTimeout(0);
      await page.setExtraHTTPHeaders({
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
      });

      await page.goto(site_url, { waitUntil: 'networkidle0' });

      const htmlAfterLoadComplete = await page.evaluate(
        () => document.querySelector('*').outerHTML
      );

      const $ = cheerio.load(htmlAfterLoadComplete);
      const ownerName = $('#WD33').text();
      const wardNumber = $('#WD38').text();
      const zoneNumber = $('#WD3C').text();
      const localityData = $('#WD41').text();
      const colonyData = $('#WD46').text();
      const mobileNumber = $('#WD4B').val();
      const emailId = $('#WD50').val();

      // Insert Single Entry
      await table.insertOne({
        uniqueId: uniqueId,
        owner_name: ownerName,
        ward_number: wardNumber,
        zone_number: zoneNumber,
        locality: localityData,
        colony_data: colonyData,
        mobile_number: mobileNumber,
        email_address: emailId,
      });

      await page.close();
      uniqueId = uniqueId + 1;
    }
    await browser.close();

    uniqueId = uniqueId - 3;
    fs.writeFile('uuid.txt', '' + uniqueId, { flag: 'wx' }, function (err) {
      if (err) throw err;
      console.log("It's saved!");
    });

    return true;
  } catch (error) {
    console.error(`getData error: ${error}`);
  }
};

getData();
