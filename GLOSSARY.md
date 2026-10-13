# Yogan Hockey

A family hockey dashboard: live NHL scores and stats, plus the seasons of the family's own players.

## Language

**Tracked Player**:
A family member whose season the site follows outside the NHL. Currently only Rylan Yogan; Andrew Yogan was one in the Parity Reference and is not carried over.
_Avoid_: Featured player, family player

**Rylan Yogan**:
The name the site and this project use for the younger Tracked Player. It is not his legal name, which leagues list him under and which is never written in this repo, its issues or the site (ADR 0005).
_Avoid_: his legal surname, anywhere

**Account**:
A family member's sign-in to the site, by username and password. Ryan creates every Account; nobody can make their own.
_Avoid_: User, profile, member

**Favorite**:
A player or a team an Account has marked with a heart. A Favorite belongs to the Account, so it is the same on every device; someone who is not signed in has none. The site has no Favorites until it has Accounts: the ones it once kept in the browser were removed (#223).
_Avoid_: Follow, bookmark, subscription

**Alert**:
A push notification the site sends to an Account's devices. An Account asks for Alerts by putting a bell on a Favorite: a team's bell sends that team's goals and the finals of its games, a player's bell sends the goals he scores.
_Avoid_: Notification, subscription, push

**Game Stream**:
The live play-by-play of one in-progress game, pushed to viewers as plays happen. It runs only while someone is watching that game.
_Avoid_: Live feed, game feed

**Replay**:
A finished game shown on the same page as a Game Stream, with every play laid out to browse or to step through in order.
_Avoid_: Highlights, recap, rewind

**Key play**:
A goal, a penalty, a shot on goal, or the start or end of a period. A game page shows key plays first and every play on request.
_Avoid_: Highlight, major event

**Prediction**:
The site's pick for an NHL game, made once before it starts: the team expected to win, a win probability, and a short reasoning. It never changes after it is made. Shown on the site as "the pick".
_Avoid_: Forecast, odds, tip, Claude's pick

**Piece**:
A short article the site prints that a model wrote from facts the site holds: a recap of the night's finals, a preview of tonight's games with the picks, a note on the standings. It is checked against those facts before it is published, and always says a model wrote it.
_Avoid_: Article, post, story (a Story is a game), AI article

**Parity Reference**:
The Elixir app in `ryanyogan/yogan_hockey`, whose seven routes define the minimum functionality the rebuild must match.
_Avoid_: Old site, legacy app

**Dateline**:
The line under the wordmark on every page: tonight's games counted by state, and the season's picks record. One short line on a phone. The date is not on it: it is on the sections' bar above the wordmark, or under the wordmark where the bar has no room.
_Avoid_: Status bar, summary line, header counts

**Lead**:
One of at most three games Home writes up as a full story: live games first, then the next to start, then the latest finals.
_Avoid_: Featured game, top story, hero

**Brief**:
A game on Home that is not a Lead, in two lines under "Around the league": the game, then its status and its pick.
_Avoid_: Row, ticker item, short

**Story**:
A game written up as a newspaper would: Kicker, Headline, Deck, line score, the pick and where it is on TV. A Lead on Home and the header of a game's page are both Stories.
_Avoid_: Card, game card, tile

**Kicker**:
The small red line of capitals above a Headline, saying a game's state and where it is played: "Final/OT · Scotiabank Arena".
_Avoid_: Eyebrow, overline, tag

**Headline**:
A game in one serif line: the winner first once it is final ("Kraken 5, Capitals 3"), away then home before that.
_Avoid_: Title, heading

**News item**:
One of ESPN's NHL headlines as Home lists it under "Headlines from ESPN": the headline's words, when ESPN published it, and the page of ESPN's it leads to. The list is the News.
_Avoid_: Headline (that is a game's), article, story, post

**Deck**:
The sentence under a Headline, built only from the game's data: "The Kraken win on the road and move to 4-2-0."
_Avoid_: Subhead, summary, blurb

**Agate name**:
A team as a table names it: its city ("Seattle"), with "N.Y. Rangers" and "N.Y. Islanders" where two clubs share one. A Headline uses the nickname instead.
_Avoid_: Short name, location, city name
