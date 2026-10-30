from PIL import Image
from collections import deque
from pathlib import Path
ids=['4d99a688-405a-4b03-9a72-1a336f795370','36167df1-1014-4f14-bd51-ee9d54e7bfb2','bf30714e-8041-4b31-9fde-37d487d17e5d','657abb57-9c18-4eba-8e88-b1233e974e60','056e9e6d-02aa-4354-a4e4-701e04228e09','fd914a68-a9c8-4105-8703-462e13dd9b93','dc4d00e9-cfe4-41d4-91d2-e4d8e5ba8892','a8020c4f-02ed-4f1c-bbb8-ce3259699ea4','0f8a1d02-65d8-45b0-aae8-138138d2d2ea','2359d5cf-cb84-45dd-968f-2a431cb976cd','ae99356b-a4a0-4be3-89df-fe72afa573c1','ae07baf7-4665-40d4-bba5-913c90f951e0']
for id in ids:
 im=Image.open(Path('C:/Users/33721/AppData/Local/Temp')/('codex-clipboard-'+id+'.png')).convert('RGB');w,h=im.size
 pixels=im.load();marked=set();out=[]
 for y in range(h):
  for x in range(w):
   r,g,b=pixels[x,y]
   if r<200 or r-g<65 or g>170 or b>180 or (x,y) in marked:continue
   q=deque([(x,y)]);marked.add((x,y));xs=[];ys=[]
   while q:
    a,c=q.popleft();xs.append(a);ys.append(c)
    for nx,ny in [(a-1,c),(a+1,c),(a,c-1),(a,c+1)]:
     if not(0<=nx<w and 0<=ny<h) or (nx,ny) in marked:continue
     rr,gg,bb=pixels[nx,ny]
     if rr>=200 and rr-gg>=65 and gg<=170 and bb<=180:marked.add((nx,ny));q.append((nx,ny))
   bw=max(xs)-min(xs)+1;bh=max(ys)-min(ys)+1
   if 50<=bw<=90 and 50<=bh<=90:out.append([min(xs),min(ys),bw,bh])
 print(id,out)
