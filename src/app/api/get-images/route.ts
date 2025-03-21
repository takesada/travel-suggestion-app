import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_CX) {
      console.error("Google Custom Search API credentials not configured")
      return NextResponse.json({ imageUrl: "/placeholder.svg" })
    }

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    }&cx=${process.env.GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(query)}&searchType=image&num=1&imgSize=large`

    const response = await fetch(searchUrl)

    if (!response.ok) {
      throw new Error("Google Custom Search API request failed")
    }

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      return NextResponse.json({ imageUrl: data.items[0].link })
    } else {
      return NextResponse.json({ imageUrl: "/placeholder.svg" })
    }
  } catch (error) {
    console.error("Error in get-images API:", error)
    return NextResponse.json(
      { imageUrl: "/placeholder.svg" },
      { status: 200 }, // Return 200 with placeholder to avoid breaking the UI
    )
  }
}

