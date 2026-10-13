import { describe, expect, test } from "vitest";
import { checkPiece, sentencesOf } from "./check";
import { GOOD_PIECE, testFacts } from "./test-facts";

const facts = testFacts();

/** The reasons a piece of these sentences is refused, after a headline that passes. */
const refused = (...paragraphs: string[]) =>
  checkPiece({ headline: "Kraken win again", paragraphs }, facts);
const passes = (...paragraphs: string[]) => expect(refused(...paragraphs)).toEqual([]);

test("a piece written from the facts passes", () => {
  expect(checkPiece(GOOD_PIECE, facts)).toEqual([]);
});

test("a full stop after an initial, an abbreviation or a time of day ends no sentence", () => {
  expect(sentencesOf("J. Smith scored at 7:00 p.m. ET in St. Louis. It ended 3-1! Fine.")).toEqual([
    "J. Smith scored at 7:00 p.m. ET in St. Louis.",
    "It ended 3-1!",
    "Fine.",
  ]);
});

describe("every team and player named is in the facts", () => {
  test("a player the facts do not hold is refused, wherever he stands in the sentence", () => {
    expect(refused("The Kraken got 2 goals from Connor McDavid.")).toEqual([
      'names "Connor", which is not in the facts',
      'names "McDavid", which is not in the facts',
    ]);
    expect(refused("McDavid scored for the Kraken.")).toContain(
      'names "McDavid", which is not in the facts',
    );
  });

  test("a team the facts do not hold is refused", () => {
    expect(refused("The Kraken are chasing the Oilers in the Pacific Division.")).toEqual([
      'names "Oilers", which is not in the facts',
    ]);
    expect(refused("Edmonton is next.")).toEqual(['names "Edmonton", which is not in the facts']);
  });

  test("a name made of one player's first name and another's surname is refused", () => {
    expect(refused("Matty Wilson scored for Seattle.")).toEqual([
      'names "Matty Wilson", which is not in the facts',
    ]);
  });

  test("one club's city with another club's nickname is refused", () => {
    expect(refused("The Seattle Canucks won.")).toEqual([
      'names "Seattle Canucks", which is not in the facts',
    ]);
  });

  test("a place the facts do not hold is refused, and one they do is not", () => {
    expect(refused("The Kraken won at Madison Square Garden.")).toHaveLength(3);
    passes("The Golden Knights visit Climate Pledge Arena at 10:00 p.m. ET on Monday.");
  });

  test("a surname alone, a possessive and an ordinary word opening a sentence all pass", () => {
    passes("Beniers scored twice. Seattle's lead held. Nobody scored after that for the Capitals.");
  });

  test("a headline in title case is refused: its capitals read as names", () => {
    const reasons = checkPiece(
      { headline: "Kraken Hold Off Capitals", paragraphs: GOOD_PIECE.paragraphs },
      facts,
    );
    expect(reasons).toEqual([
      'names "Hold", which is not in the facts',
      'names "Off", which is not in the facts',
    ]);
  });
});

describe("every score and figure matches the facts", () => {
  test("a final score that no final had is refused", () => {
    expect(refused("The Kraken beat the Capitals 6-3 on Sunday.")).toEqual([
      "gives a score of 6-3 that matches no final in the facts",
    ]);
    expect(refused("The Kraken won 5 to 2.")).toEqual([
      "gives a score of 5 to 2 that matches no final in the facts",
    ]);
  });

  test("a score is read against the game of the teams the sentence names", () => {
    // 5-3 was Seattle at Washington, not Dallas at Buffalo.
    expect(refused("The Stars won 5-3 at Buffalo.")).toEqual([
      "gives a score of 5-3 that matches no final in the facts",
    ]);
    passes("The Stars won 4-3 at Buffalo.");
  });

  test("a score line gives each team its own score", () => {
    passes("Kraken 5, Capitals 3.", "Washington 3, Seattle 5 was the final.");
    expect(refused("Capitals 5, Kraken 3.")).toEqual([
      'gives a score, "Capitals 5, Kraken 3", that matches no final in the facts',
    ]);
  });

  test("a score the game passed through is allowed, and one it never reached is not", () => {
    passes("The Capitals tied it 3-3 before the Kraken pulled away.");
    expect(refused("The Capitals led 4-2 before the Kraken pulled away.")).toEqual([
      "gives a score of 4-2 that matches no final in the facts",
    ]);
  });

  test("a result the wrong way round is refused", () => {
    expect(refused("The Capitals beat the Kraken on Sunday.")).toEqual([
      'says "The Capitals beat the Kraken", and no final in the facts has that result',
    ]);
    expect(refused("Buffalo edged Dallas in a shootout.")).toHaveLength(1);
  });

  test("a record must be the record of the team it is given to", () => {
    passes("The Kraken are 4-2-0 and the Capitals are 3-2-0.");
    expect(refused("The Kraken are 5-1-0.")).toEqual([
      "gives a record of 5-1-0 that the facts do not hold for the team named",
    ]);
    // 3-1-1 is Dallas's.
    expect(refused("The Kraken are 3-1-1.")).toHaveLength(1);
  });

  test("any other figure must be in the facts", () => {
    passes("Seattle has 8 points and has won 3 in a row. The puck drops at 10 p.m. ET.");
    expect(refused("Seattle has 13 points.")).toEqual([
      "gives a figure, 13, that is not in the facts",
    ]);
    expect(refused("Beniers scored at 14:02 of the 1st.")).toEqual([
      "gives a figure, 14:02, that is not in the facts",
    ]);
  });
});

describe("nothing contradicts the Predictions", () => {
  test("the site's pick, said as the site says it, passes", () => {
    passes(
      "Our pick: Seattle, 63%.",
      "The pick is the Kraken over the Golden Knights at 63 percent.",
      "Seattle is the pick at home against Vegas.",
    );
  });

  test("saying the other team is the pick is refused, however it is worded", () => {
    const wrong = "says the pick is Vegas, and the site's pick is SEA";
    expect(refused("Our pick: Vegas, 63%.")).toContain(wrong);
    expect(refused("The pick is Vegas.")).toEqual([wrong]);
    expect(refused("Vegas is the pick on the road.")).toEqual([wrong]);
    expect(refused("The site picks Vegas to win in Seattle.")).toEqual([wrong]);
    expect(refused("The Golden Knights are favored in Seattle.")).toEqual([
      "says the pick is Golden Knights, and the site's pick is SEA",
    ]);
    expect(refused("The pick is Vegas over Seattle.")).toEqual([
      wrong,
      "says the pick is against Seattle, and Seattle is the site's pick",
    ]);
  });

  test("a forecast of the piece's own is held to the site's pick", () => {
    expect(refused("Vegas will win in Seattle.")).toEqual([
      "says the pick is Vegas, and the site's pick is SEA",
    ]);
    passes("The pick says the Kraken should win at home.");
  });

  test("a pick for a game the site has not picked is refused", () => {
    expect(refused("The pick is Dallas in Vancouver.")).toEqual([
      "says the pick is Dallas, and the site's pick is BUF",
    ]);
    expect(refused("Vancouver is the pick at home.")).toEqual([
      "says the pick is Vancouver, and the site has no pick for that game",
    ]);
  });

  test("a chance that is not the pick's, or is given to the other team, is refused", () => {
    expect(refused("Our pick: Seattle, 71%.")).toEqual([
      "gives a chance of 71% that is not the site's pick",
    ]);
    expect(refused("Vegas has a 63% chance in Seattle's rink, by our pick.")).toEqual([]);
    expect(refused("Vegas gets 63% from the pick.")).toEqual([
      "gives a chance of 63% that is not the site's pick",
      "speaks of the pick and names only a team the site did not pick",
    ]);
  });

  test("how a pick did is read against the final", () => {
    passes("Our pick was Seattle, and it was right.", "The pick of Buffalo was wrong.");
    expect(refused("Our pick of Buffalo was right.")).toEqual([
      "says a pick was right that the facts mark wrong",
    ]);
    expect(refused("The pick was Seattle over Washington, and it missed.")).toEqual([
      "says a pick was wrong that the facts mark right",
    ]);
  });
});

describe("no quotes from real people", () => {
  test("quotation marks of any kind are refused", () => {
    for (const quoted of [
      'Beniers called it "a good night" for Seattle.',
      "Beniers called it “a good night” for Seattle.",
      "Beniers called it 'a good night' for Seattle.",
    ]) {
      expect(refused(quoted)).toEqual(["uses quotation marks: a piece quotes nobody"]);
    }
  });

  test("words given to someone without marks are refused", () => {
    expect(refused("Beniers said the Kraken were ready.")).toEqual([
      'attributes words to someone ("said"): a piece quotes nobody',
    ]);
    expect(refused("The Kraken were ready, according to Beniers.")).toHaveLength(1);
    expect(refused("Wilson told reporters the Capitals were flat.")).toHaveLength(1);
    expect(refused("Wilson says the Capitals were flat.")).toHaveLength(1);
  });

  test("an apostrophe is not a quotation mark", () => {
    passes("The Kraken's lead held, and the Capitals' run didn't come.");
  });
});

describe("nothing the facts do not hold", () => {
  test.each([
    ["Beniers returned from a lower-body injury.", "injuries"],
    ["The Capitals were without Wilson, who is hurt.", "injuries"],
    ["Seattle placed Dunn on IR.", "injuries"],
    ["The Kraken acquired McCann in a trade.", "trades and signings"],
    ["Strome signed an extension with Washington.", "trades and signings"],
    ["Wilson was suspended after the game.", "suspensions and discipline"],
    ["The Capitals' coach changed his lines.", "coaches and front offices"],
    ["Sources expect the Sabres to make a move.", "rumours"],
    ["The odds are with Seattle.", "betting"],
  ])("%s", (sentence, topic) => {
    expect(refused(sentence).join("\n")).toContain(`speaks of ${topic}`);
  });
});

test("every reason is reported once, however often the piece repeats the fault", () => {
  expect(refused("McDavid scored. McDavid scored again for the Kraken.")).toEqual([
    'names "McDavid", which is not in the facts',
  ]);
});
