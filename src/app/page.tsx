"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

const formSchema = z.object({
  destination: z.string().min(2, {
    message: "目的地を入力してください。",
  }),
  budget: z.string().min(1, {
    message: "予算を入力してください。",
  }),
  people: z.string().min(1, {
    message: "人数を入力してください。",
  }),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  travelStyle: z.string({
    required_error: "旅のスタイルを選択してください。",
  }),
})

type TravelPlanDay = {
  day: number
  date: string
  activities: {
    time: string
    activity: string
    location: string
    description: string
    type: "sightseeing" | "meal" | "accommodation" | "transportation"
  }[]
}

type TravelPlan = {
  destination: string
  summary: string
  days: TravelPlanDay[]
}

type ImageResult = {
  location: string
  imageUrl: string
}

export default function TravelPlannerPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null)
  const [images, setImages] = useState<ImageResult[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      budget: "",
      people: "2",
      travelStyle: "観光",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setTravelPlan(null)
    setImages([])

    try {
      // Generate travel plan
      const planResponse = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: values.destination,
          budget: values.budget,
          people: values.people,
          dateRange: {
            from: format(values.dateRange.from, "yyyy-MM-dd"),
            to: format(values.dateRange.to, "yyyy-MM-dd"),
          },
          travelStyle: values.travelStyle,
        }),
      })

      if (!planResponse.ok) {
        throw new Error("旅行プランの生成に失敗しました")
      }

      const planData = await planResponse.json()
      setTravelPlan(planData)
      // Get images for locations
      const locations = planData.days.flatMap((day: { activities: { location: string }[] }) => 
        day.activities.map((activity: { location: string }) => activity.location)
      )
      const uniqueLocations = [...new Set(locations)]

      const imagePromises = uniqueLocations.map(async (location) => {
        const imageResponse = await fetch("/api/get-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `${location} ${planData.destination}`,
          }),
        })

        if (!imageResponse.ok) {
          return { location, imageUrl: "/placeholder.svg" }
        }

        const imageData = await imageResponse.json()
        return {
          location,
          imageUrl: imageData.imageUrl || "/placeholder.svg",
        }
      })
      const imageResults = await Promise.all(imagePromises) as ImageResult[]
      setImages(imageResults)
    } catch (error) {
      console.error("Error generating travel plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sharePlan = async () => {
    if (!travelPlan) return

    try {
      await navigator.share({
        title: `${travelPlan.destination}への旅行プラン`,
        text: `${travelPlan.destination}への旅行プラン: ${travelPlan.summary}`,
        url: window.location.href,
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 bg-softblue-light min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-softblue-dark">Plannity</h1>

      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="border-softblue">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目的地</FormLabel>
                      <FormControl>
                        <Input placeholder="例: 京都" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>予算 (円)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="例: 100000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="people"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>人数</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="例: 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>日程</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.from ? (
                                field.value.to ? (
                                  <>
                                    {format(field.value.from, "yyyy/MM/dd")} - {format(field.value.to, "yyyy/MM/dd")}
                                  </>
                                ) : (
                                  format(field.value.from, "yyyy/MM/dd")
                                )
                              ) : (
                                <span>日程を選択</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>旅のスタイル</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="旅のスタイルを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="観光">観光</SelectItem>
                          <SelectItem value="グルメ">グルメ</SelectItem>
                          <SelectItem value="アクティビティ">アクティビティ</SelectItem>
                          <SelectItem value="リラックス">リラックス</SelectItem>
                          <SelectItem value="文化体験">文化体験</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full py-6 text-lg bg-softblue hover:bg-softblue-dark text-black border border-gray-200"
                  disabled={isLoading}
                >
                  {isLoading ? "生成中..." : "旅行プランを生成"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : travelPlan ? (
          <Card className="border-softblue">
            <CardContent className="pt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-softblue-dark">{travelPlan.destination}への旅行プラン</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-softblue text-softblue"
                  onClick={sharePlan}
                >
                  <Share2 className="h-4 w-4" />
                  シェア
                </Button>
              </div>

              <div className="bg-softblue-light p-4 rounded-lg border border-softblue/20">
                <p>{travelPlan.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.slice(0, 4).map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                    <img
                      src={image.imageUrl || "/placeholder.svg"}
                      alt={image.location}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm">
                      {image.location}
                    </div>
                  </div>
                ))}
              </div>

              <Tabs defaultValue="itinerary">
                <TabsList className="grid w-full grid-cols-2 bg-softblue-light">
                  <TabsTrigger
                    value="itinerary"
                    className="data-[state=active]:bg-softblue data-[state=active]:text-white"
                  >
                    旅程表
                  </TabsTrigger>
                  <TabsTrigger
                    value="places"
                    className="data-[state=active]:bg-softblue data-[state=active]:text-white"
                  >
                    場所
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="itinerary" className="space-y-4">
                  {travelPlan.days.map((day) => (
                    <Card key={day.day} className="border-softblue/20">
                      <CardContent className="pt-6">
                        <h3 className="font-bold mb-4 text-softblue-dark">
                          Day {day.day}: {day.date}
                        </h3>
                        <div className="space-y-4">
                          {day.activities.map((activity, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-[80px_1fr] gap-2 p-2 rounded-md hover:bg-softblue-light transition-colors"
                            >
                              <div className="text-sm text-softblue font-medium">{activity.time}</div>
                              <div>
                                <div className="font-medium">{activity.activity}</div>
                                <div className="text-sm">{activity.location}</div>
                                <div className="text-sm text-muted-foreground">{activity.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="places">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                        <img
                          src={image.imageUrl || "/placeholder.svg"}
                          alt={image.location}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                          {image.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-softblue/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <p className="mb-2">旅行の詳細を入力して「旅行プランを生成」ボタンをクリックしてください</p>
                <p>目的地、予算、日程、旅のスタイルに基づいた旅行プランを生成します</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

