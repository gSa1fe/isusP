import Link from 'next/link'
import Image from 'next/image'
import { Comic } from '@/types'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ComicCardProps {
  comic: Comic
}

export default function ComicCard({ comic }: ComicCardProps) {
  return (
    <Link href={`/comic/${comic.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-0 shadow-none bg-transparent hover:bg-accent/50 transition-colors duration-300">
        <CardContent className="p-2">
          {/* Cover Image */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted shadow-sm group-hover:shadow-md transition-all">
            {comic.cover_image_url ? (
              <Image
                src={comic.cover_image_url}
                alt={comic.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No Image</div>
            )}
            
            {/* Genre Badge (ลอยอยู่มุมขวาบน) */}
            <div className="absolute top-2 right-2">
               <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-black text-xs font-normal">
                 {comic.genre || 'Webtoon'}
               </Badge>
            </div>
          </div>

          {/* Text Content */}
          <div className="pt-3 space-y-1">
            <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {comic.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {comic.description || 'ไม่มีคำอธิบาย'}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}