require("dotenv").config();

const twit = require("twit");
const config = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
};
const Twitter = new twit(config);

const KEYWORDS = process.env.KEYWORDS.split(",").map(keyword => keyword.trim());

let getAccountsFromList = async function(listId) {
  let returnLimit = 100;
  let resultsCursor = null;
  let userData = [];
  let allDataIsReturned = false;
  try {
    do {
      let { data } = await Twitter.get('lists/members', {
        list_id: listId,
        count: returnLimit,
        ...(resultsCursor && { cursor: resultsCursor })
      });
      userData = userData.concat(data.users);
      resultsCursor = data.next_cursor;
      if(resultsCursor == 0) {
        allDataIsReturned = true;
      }
    } while (!allDataIsReturned);
    return userData;
  } catch (err) {
    console.error("Err:", err);
  }
}

let getUserIdsFromAccounts = async function(accounts) {
  return await accounts.map(account => account.id_str);
}

let collectMessagesFromUsers = async function(userIds) {
  let messages = [];
  for(let id of userIds) {
    let newMessages  = await getUserTimeline(id);
    /**
    *  Use this code block if we only want the first message
    **/
    // let firstFilteredMessage = findFirstFilteredUserMessage(newMessages);
    // if (firstFilteredMessage) {
    //   messages = messages.concat(firstFilteredMessage);

    // }
    messages = messages.concat(newMessages);
    messages = await filterUserMessages(messages);
  };
  return messages;
}

let getUserTimeline = async function(userId) {
  try {
    let { data } = await Twitter.get('statuses/user_timeline', {
      user_id: userId,
      count: 20,
      trim_user: 1,
      exclude_replies: process.env.EXCLUDE_REPLIES,
      include_rts: process.env.INCLUDE_RETWEETS
    });
    return data;
  } catch (err) {
    console.error("Err:", err);
  }
}

let filterUserMessages = async function(messages) {
  let filteredMessages = [];
  let includeQuoteTweets = (process.env.INCLUDE_QUOTE_TWEETS === 'true');
  let now = new Date();
  let last = new Date(now.getTime() - (parseInt(process.env.FROM_DAYS_AGO) * 24 * 60 * 60 * 1000));
  messages.forEach(message => {
    let quoteStatusMatches = message.is_quote_status === includeQuoteTweets;
    let messageTime = new Date(Date.parse(message.created_at));
    if (last >= messageTime) {
      return;
    }
    if ( !quoteStatusMatches
        || message.retweeted
        || message.favorited
        || message.in_reply_to_status_id != null
    ) {
      return;
    }
    for (let j=0; j < KEYWORDS.length; j++) {
      let messageText = message.text.toLowerCase();
      if (messageText.includes(KEYWORDS[j].toLowerCase())) {
        filteredMessages.push(message);
        break;
      }
    }
  });
  return filteredMessages;
}

let findFirstFilteredUserMessage = function(messages) {
  for (let i=0; i < messages.length; i++) {
    if ( messages[i].is_quote_status
      || messages[i].retweeted
      || messages[i].favorited
      || messages[i].in_reply_to_status_id != null
    ) {
      continue;
    }
    for (let j=0; j < KEYWORDS.length; j++) {
      if (messages[i].text.toLowerCase().includes(KEYWORDS[j].toLowerCase())) {
        return messages[i];
      }
    }
    return null;
  }
}

let retweetLikeMessages = async function(messages, rt, like) {
  responses = [];
  try{
    for(message of messages) {
      if (rt) {
        let responseRT = await Twitter.post("statuses/retweet/:id", {
          id: message.id_str
        });
        responses.push(responseRT);
        console.log("Successfully retweeted");
        console.log(responseRT);
      }
      if (like) {
        let responseLike = await Twitter.post("favorites/create", {
          id: message.id_str
        });
        responses.push(responsLike);
        console.log("Successfully liked");
        console.log(responseLike);
      }
    };
    console.log('Completed retweetLikeMessages function');
    console.log(responses);
  } catch (err) {
    console.error("Err:", err);
  }
}

let collectMessages = async function() {
  let accounts = await getAccountsFromList(process.env.LIST_ID);
  let ids = await getUserIdsFromAccounts(accounts);
  let messages = await collectMessagesFromUsers(ids);
  //let retweetAction = await retweetLikeMessages(messages, true, true);
  console.log(messages);
  await console.log('Messages collected');
}

collectMessages();

