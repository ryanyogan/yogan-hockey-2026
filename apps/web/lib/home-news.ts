import type { News } from "@yogan-hockey/schemas";
import { cachedNews } from "./espn";

/**
 * The league's news for Home: ESPN's headlines, or null when there are none to list. ESPN not
 * answering, its news having changed shape and its having no headlines are all the same to Home,
 * which leaves the section out and draws the rest, so this never rejects. A failure is logged
 * here, where the Worker's logs keep it; the ESPN check is what raises it.
 */
export async function readHomeNews(): Promise<News | null> {
  try {
    const news = await cachedNews();
    return news.length > 0 ? news : null;
  } catch (error) {
    console.error("ESPN's news could not be read", error);
    return null;
  }
}
