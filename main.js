const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");
const fs = require("fs");
const parseArgs = require('minimist')
const jsonConverter = require('json-2-csv')
const web3validator = require('web3-validator')
const runApp = async () => {
  const args = parseArgs(process.argv.slice(2), {
    string: "a"
  });
  if(!args.a || !web3validator.isAddress(args.a)) {
    console.log("missed contract address or address is not correct")
    return;
  }
  
  const chainName = args.c.toUpperCase();

  if(!args.c || !EvmChain[chainName]) {
    console.log("missed chain or wrong chain")
    return;
  } 

  const address = args.a // contract address
  const chain = EvmChain[chainName];
  const moralisApiKey = "mgHMiI4L52Jm0IA80eaeAHETfs2ZS4d5xjsS3tjFVxqdS67JiS4nGfHtHdiAgBp1";

  await Moralis.start({
    apiKey: moralisApiKey
  });

  let cursor = null;
  let owners = {};

  do {
    const responseJSON = await Moralis.EvmApi.nft.getNFTOwners({
      address,
      chain,
      limit: 100,
      cursor: cursor,
    });
    const response  = responseJSON.toJSON();
    console.log(
      `Got page ${response.page} of ${Math.ceil(
        response.total / response.page_size
      )}, ${response.total} total`
    );
    for (const owner of response.result) {
      if(owner.owner_of !== "0x000000000000000000000000000000000000dead") {
        if(!owners[owner.owner_of]) owners[owner.owner_of] = []

        const transferJSON = await Moralis.EvmApi.nft.getNFTTransfers({
          address,
          chain,
          tokenId: owner.token_id
        });
        const transferData = transferJSON.toJSON()
        const minted_address = transferData.result[transferData.result.length - 1].to_address
        ///////////////////// during days ///////////////////////
        const last_transfer_time = transferData.result[0].block_timestamp
        const diff_days = parseInt((new Date() - new Date(last_transfer_time)) / (1000 * 60 * 60 * 24));
        /////////////////////////////////////////////////////////

        owners[owner.owner_of].push({
          amount: owner.amount,
          tokenId: owner.token_id,
          // owner: owner.owner_of,
          minted_address: minted_address,
          holding_days: diff_days,
          token_uri: owner.token_uri
        })
      }
    }
    cursor = response.cursor;
  } while (cursor != "" && cursor != null);

  let detailData = [];
  let i = 1;
  for (const ownerdata in owners) {
    detailData.push({
      id : i++,
      owner: ownerdata,
      numberofNFTs: owners[ownerdata].length,
      nft: owners[ownerdata]
    })
  }

  fs.writeFileSync("./NFTHolderInfo.json", JSON.stringify(detailData));

  const csv = await jsonConverter.json2csv(detailData, { expandArrayObjects : true, unwindArrays : true})
  fs.writeFileSync('./detail.csv', csv)
};

runApp();
