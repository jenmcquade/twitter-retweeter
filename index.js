require("dotenv").config();

const twit = require("twit");
const config = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
};
const Twitter = new twit(config);

const MAX_RT_COUNT = 1;

const USERS = [
  "15057943", // moma
  "14803372", // saam
  "5225991", // tate
  "22009731", // design museum
  "81783051", // artsy
  "17896874", // itsnicethat
  "158865339", // fastcodesign
  "21661279", // creative review
  "16336998", // print magazine
  "17623957", // design observer
  "418597196", // creativebloq
  "15446126", // design milk
  "18201801", // interior design
  "19038849" // how design
];

const getUserOfTheDay = () => {
  let date = new Date();
  let dayOfMonth = date.getDate();
  let pickUserIndex = dayOfMonth % USERS.length;

  return USERS[pickUserIndex];
};

let now = new Date();
let millisTill10 =
  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0) - now;
if (millisTill10 < 0) {
  millisTill10 += 86400000; // it's after 10am, try 10am tomorrow.
}

let retweetTags = async function() {
  try {
    const { data } = await Twitter.get("search/tweets", {
      q: "#art, #painting",
      result_type: "mixed",
      lang: "en"
    });

    const statuses = data.statuses.slice(0, MAX_RT_COUNT);

    // loop through the first n returned tweets
    for (const status of statuses) {
      // the post action
      const response = await Twitter.post("statuses/retweet/:id", {
        id: status.id_str
      });

      if (response) {
        console.log("Successfully retweeted");
      }
    }
  } catch (err) {
    // catch all log if the search/retweet could not be executed
    console.error("Err:", err);
  }
};

// retweetTags();
// setInterval(retweetTags, 600000);

let retweetUsers = async function() {
  try {
    const { data } = await Twitter.get("users/show", {
      user_id: getUserOfTheDay()
    });
    const status = data.status;
    // make sure tweet isn't in reply to another user
    if (status.in_reply_to_status_id == null) {
      const response = await Twitter.post("statuses/retweet/:id", {
        id: status.id_str
      });
      if (response) {
        console.log("Successfully retweeted");
      }
    }
  } catch (err) {
    // catch all log if the search/retweet could not be executed
    console.error("Err:", err);
  }
};

retweetUsers();
// setTimeout(retweetUsers, millisTill10);