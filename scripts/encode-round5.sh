#!/bin/sh
# Round 5 media: full-length clips (nothing is cut), metadata stripped, MP4 (h264, faststart, mono audio), plus a poster frame each.
# WebM (VP9) was tried and came out LARGER than the already-compressed H.264 sources, so it is not shipped.
# The sources were already low-bitrate, hence the high CRF values. Run from the website folder (the one holding the original files).
set -e
OUT=robotics-portfolio/public/media/vid
IMG=robotics-portfolio/public/media/img
mp4() { # name src width crf audio-kbps
  ffmpeg -y -v error -i "$2" -map_metadata -1 -vf "scale=$3:-2" -c:v libx264 -preset slow -crf $4 -pix_fmt yuv420p -c:a aac -b:a ${5}k -ac 1 -movflags +faststart "$OUT/$1.mp4"
  ffmpeg -y -v error -ss 1 -i "$2" -frames:v 1 -vf "scale=$3:-2" -q:v 4 -map_metadata -1 "$IMG/$1-poster.jpg"
}
mp4 cat "cat.mp4" 480 36 56
mp4 soccer-run "robosoccer vid.mp4" 720 32 64
mp4 cena "HIS NAME IS JOHN CENA.mp4" 512 36 56
mp4 rick "Rick_Astley_Never_Gonna_Give_You_Up.avi" 512 36 56
ffmpeg -y -v error -i "hint video.mp4" -map_metadata -1 -c copy -movflags +faststart "$OUT/tell-me.mp4" # 0.9 MB already: only the metadata is stripped
ffmpeg -y -v error -ss 1 -i "hint video.mp4" -frames:v 1 -q:v 4 -map_metadata -1 "$IMG/tell-me-poster.jpg"

mp4 omae "vidssave.com Omae wa mou shindeiru Original 1080P.mp4" 720 30 64
echo ENCODED
