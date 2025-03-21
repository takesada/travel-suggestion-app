import { NextResponse } from "next/server"
import { differenceInDays, addDays, format } from "date-fns"

export async function POST(request: Request) {
  try {
    const { destination, budget, people, dateRange, travelStyle } = await request.json()

    // Calculate number of days
    const startDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    const numberOfDays = differenceInDays(endDate, startDate) + 1

    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API key is not configured")
    }

    // Prepare prompt for DeepSeek API
    const prompt = `
      あなたは旅行プランナーです。以下の条件に基づいて、詳細な旅行プランを日本語で作成してください。
      
      目的地: ${destination}
      予算: ${budget}円
      人数: ${people}人
      期間: ${numberOfDays}日間 (${dateRange.from} から ${dateRange.to})
      旅のスタイル: ${travelStyle}
      
      以下の形式でJSON形式で出力してください。他の説明は不要です。
      
      {
        "destination": "目的地名",
        "summary": "旅行の概要説明（200文字程度）",
        "days": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "activities": [
              {
                "time": "09:00",
                "activity": "活動名",
                "location": "場所名",
                "description": "簡単な説明",
                "type": "sightseeing" または "meal" または "accommodation" または "transportation"
              },
              ...
            ]
          },
          ...
        ]
      }
      
      各日に少なくとも朝食、昼食、夕食、宿泊施設を含めてください。また、観光スポットや活動も含めてください。
      予算内で実現可能な現実的なプランを作成してください。
      地元の人気スポットや、${travelStyle}に合った場所を優先してください。
      実在する場所や施設の名前を使用してください。
    `

    // Call DeepSeek API
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("DeepSeek API error:", errorData)
      throw new Error("DeepSeek API request failed")
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Extract JSON from the response
    let travelPlan
    try {
      // Find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        travelPlan = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (error) {
      console.error("Error parsing JSON:", error)

      // If parsing fails, create a fallback plan
      travelPlan = createFallbackPlan(destination, numberOfDays, startDate, travelStyle)
    }

    return NextResponse.json(travelPlan)
  } catch (error) {
    console.error("Error in generate-plan API:", error)
    return NextResponse.json({ error: "Failed to generate travel plan" }, { status: 500 })
  }
}

function createFallbackPlan(destination: string, numberOfDays: number, startDate: Date, travelStyle: string) {
  const days = []

  for (let i = 0; i < numberOfDays; i++) {
    const currentDate = addDays(startDate, i)
    const formattedDate = format(currentDate, "yyyy-MM-dd")

    days.push({
      day: i + 1,
      date: formattedDate,
      activities: [
        {
          time: "08:00",
          activity: "朝食",
          location: `${destination}のホテルレストラン`,
          description: "ホテルでの朝食",
          type: "meal",
        },
        {
          time: "10:00",
          activity: `${destination}観光`,
          location: `${destination}の人気スポット`,
          description: `${travelStyle}を楽しむ`,
          type: "sightseeing",
        },
        {
          time: "12:30",
          activity: "昼食",
          location: `${destination}のローカルレストラン`,
          description: "地元の料理を楽しむ",
          type: "meal",
        },
        {
          time: "14:00",
          activity: "アクティビティ",
          location: `${destination}のアクティビティスポット`,
          description: `${travelStyle}に関連したアクティビティ`,
          type: "sightseeing",
        },
        {
          time: "18:00",
          activity: "夕食",
          location: `${destination}の評価の高いレストラン`,
          description: "特別な夕食",
          type: "meal",
        },
        {
          time: "20:00",
          activity: "宿泊",
          location: `${destination}のホテル`,
          description: "快適なホテルでの宿泊",
          type: "accommodation",
        },
      ],
    })
  }

  return {
    destination: destination,
    summary: `${destination}への${numberOfDays}日間の旅行プランです。${travelStyle}を中心に、地元の文化や料理を楽しむことができます。主要な観光スポットを訪れながら、${destination}の魅力を存分に体験できるプランになっています。`,
    days: days,
  }
}

