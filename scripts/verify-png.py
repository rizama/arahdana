"""Validate browser-generated 8-bit RGB/RGBA PNG artifacts using only stdlib."""
import json, pathlib, struct, sys, zlib

def decode(path):
    blob=path.read_bytes()
    assert blob[:8]==b'\x89PNG\r\n\x1a\n'
    offset=8; compressed=b''; dimensions=None; ended=False
    while offset<len(blob):
        size=struct.unpack('>I',blob[offset:offset+4])[0]
        kind=blob[offset+4:offset+8];data=blob[offset+8:offset+8+size]
        crc=struct.unpack('>I',blob[offset+8+size:offset+12+size])[0]
        assert zlib.crc32(kind+data)&0xffffffff==crc, 'CRC mismatch'
        if kind==b'IHDR':
            w,h,depth,ctype,compression,filtering,interlace=struct.unpack('>IIBBBBB',data)
            assert depth==8 and ctype in (2,6) and compression==filtering==interlace==0
            dimensions=(w,h);channels=3 if ctype==2 else 4
        if kind==b'IDAT':compressed+=data
        offset+=size+12
        if kind==b'IEND':ended=True;break
    assert ended and offset==len(blob)
    w,h=dimensions; raw=zlib.decompress(compressed);stride=w*channels
    assert len(raw)==(stride+1)*h
    previous=bytearray(stride);probes={}
    for y in range(h):
        start=y*(stride+1);ft=raw[start];line=bytearray(raw[start+1:start+1+stride]);assert 0<=ft<=4
        for x in range(stride):
            a=line[x-channels] if x>=channels else 0;b=previous[x];c=previous[x-channels] if x>=channels else 0
            if ft==1:prediction=a
            elif ft==2:prediction=b
            elif ft==3:prediction=(a+b)//2
            elif ft==4:
                p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
                prediction=a if pa<=pb and pa<=pc else b if pb<=pc else c
            else:prediction=0
            line[x]=(line[x]+prediction)&255
        if y in (0,200):probes[str(y)]=list(line[:channels])
        previous=line
    expected=(1080,1920) if 'story' in path.name else (1024,1024)
    assert dimensions==expected
    dark='dark' in path.name
    assert probes['200'][:3]==([16,27,24] if dark else [242,243,237]), 'Theme pixel mismatch'
    return dict(file=str(path),type='image/png',width=w,height=h,channels=channels,crc='PASS',decoded='PASS',theme_pixel=probes['200'])

if __name__=='__main__':print(json.dumps([decode(pathlib.Path(p)) for p in sys.argv[1:]],indent=2))
