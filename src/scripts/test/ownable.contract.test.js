// todo write ownable tests
// import { expect } from "chai";
// import fs from "fs";
// import {
//   addressses,
//   sks,
//   // beacon
//   touch,
//   // bank managaer
//   deposit,
//   // common
//   deploy,
//   bootstrap,
// } from "../command.js";

// const acc = {
//   sender: addressses.deployer,
//   sk: sks.deployer,
// };

// describe("ownable: Ownable Testing", function () {
//   this.timeout(100000);
//   let contract;
//   let appId;
//   let beaconAppId;
//   let beaconContract;

//   before(async function () {});

//   beforeEach(async function () {
//     const now = Date.now();
//     {
//       const { appId: id, appClient } = await deploy({
//         type: "Beacon",
//         name: `Beacon${now}`,
//         debug: false,
//       });
//       beaconAppId = id;
//       beaconContract = appClient;
//     }
//     {
//       const { appId: id, appClient } = await deploy({
//         type: "BankManager",
//         name: `BankManager${now}`,
//         debug: false,
//       });
//       appId = id;
//       contract = appClient;
//       await bootstrap({
//         appId,
//         ...acc,
//       });
//     }
//   });

//   afterEach(async function () {
//     await touch({
//       appId: beaconAppId,
//       ...acc,
//     });
//   });

//   it("Should deploy the beacon contract", async function () {
//     expect(beaconAppId).to.not.equal(0);
//   });

//   it("Should deploy bank manager contract", async function () {
//     expect(appId).to.not.equal(0);
//   });

//   it("Should deposit", async function () {
//     const depositR = await deposit({
//       appId,
//       amount: 1 * 1e6,
//       ...acc,
//       debug: true,
//     });
//     console.log(depositR);
//     // here
//   });
//   // more tests
// });
