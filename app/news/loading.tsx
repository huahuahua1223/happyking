export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}
