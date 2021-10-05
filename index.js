require("dotenv").config();
const fs = require("fs").promises;
const got = require("got");
const { WebhookClient, MessageEmbed } = require("discord.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const monitorLeaseTrader = async () => {
  while (true) {
    try {
      const scrapped = require("./lt_scrapped.json");

      const r = await got({
        url: "https://api.leasetrader.com/api/Lease/NewSearchData/",
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
        },
        json: {
          UserId: 0,
          searchKey: "",
          Searchtype: "",
          searchprocess: "",
          yearTo: 0,
          sortby: "",
          sorttype: "Months_low",
          sortorder: "",
          // Changed this from default of 12/13
          rowcount: 1000,
          yearlist: [],
          miles: 0,
          MonthPay: 0,
          MilesPM: 0,
          makelist: [],
          stylelistdata: "",
          stylelist: [],
          modellist: [],
          statelist: [],
          colorlist: [],
          categorylist: [],
          TypeList: "",
          pagenumber: 0,
          make: 0,
          car_model: 0,
          year: 0,
          Zip: "",
          Type: 0,
          newused: 0,
          Vstyle: 0,
          series: 0,
          fromyr: 0,
          YearTo: 0,
          // Max amount of months left on lease
          Maxmonth: "15",
          // Min amount of months left on lease
          Minmonth: "6",
          incentives: false,
          MonthR: 0,
          Zipcode: 0,
          budgetfrom: 0,
          budgetto: 0,
          DealerList: true,
          Lnumber: 0,
          FuelEff: "",
          EngineId: 0,
          FulesV: 0,
          Vdoor: 0,
          Tranmission: 0,
          Dtrain: 0,
          Advyear: 0,
          AdvToyear: 0,
          // Current page for search (dont matter since we show 1000 rows)
          currentPage: 1,
          // Actual search filters they match on backend?
          searchval:
            "sorttype=Months_low&Minmonth=6&Maxmonth=15&MaxMonthPay=2001&MinMonthPay=470",
          Param: "Search",
          MoreType: "",
          StatusType: "",
          MinMonthPay: "500",
          MaxMonthPay: "2200",
          fuellist: [],
          enginelist: [],
          transmissionlist: [],
          drivetrainlist: [],
          listingId: "",
          list_searchType: [],
          city: "",
          state: "",
          country: "",
          latitude: "",
          longitude: "",
          IP_Address: "",
        },
        responseType: "json",
      });

      let added = 0;
      for (const car of r.body.Data.AllCarList) {
        if (!scrapped[car.listing_id]) {
          scrapped[car.listing_id] = car;
          sendAlert(car);
          added++;
        }
      }

      if (added) {
        console.log(`Scrapped ${added} new listings`);
        fs.writeFile("./lt_scrapped.json", JSON.stringify(scrapped, null, 2));
      }

      return true;
    } catch (err) {
      console.log(err);
      await sleep(1000 * 5);
    }
  }
};

const sendAlert = (listing) => {
  const webhook = new WebhookClient({
    url: process.env.DISCORD_WEBHOOK,
  });

  const embed = new MessageEmbed()
    .setTitle(listing.Description1)
    .setDescription(listing.SellerComments)
    .addFields([
      {
        name: "Lease Payment",
        value: `$${listing.monthlypayment} p/month ${
          listing.incentive !== "0.00" &&
          `(after $${listing.incentive} incentive)`
        }`,
      },
      {
        name: "Down Payment",
        value: `$${listing.down_payment || 0}`,
      },
      {
        name: "Months Remaining",
        value: `${listing.MonthRemaining}`,
      },
      {
        name: "Location",
        value: `${listing.city}, ${listing.state_id} ${listing.zip}`,
      },
      {
        name: "Miles Per Month",
        value: `${Number(listing.MilesPerMonth).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}`,
      },
      {
        name: "Excess Miles Charge",
        value: `$${Number(listing.ExcessCharge).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })} per mile`,
      },
      {
        name: "Vehicle Status",
        value: `${listing.status_desc.toUpperCase()}`,
      },
    ])
    .setURL(`https://www.leasetrader.com/listing/${listing.Url}`)
    .setColor("#0099ff");

  if (listing.imageurl)
    embed.setImage(
      `https://d20j1l9w6xi077.cloudfront.net/VehicleImage//fit-in/400x300/${listing.imageurl}`
    );
  else if (listing.StockImage1) {
    embed.setImage(
      `https://d20j1l9w6xi077.cloudfront.net/StockImage//fit-in/400x300/${listing.StockImage1}`
    );
  }

  webhook.send({ embeds: [embed] });
};

const main = async () => {
  while (true) {
    try {
      await monitorLeaseTrader();
      await sleep(1000 * 60 * 30);
    } catch (err) {
      console.log(err);
    }
  }
};

main();
