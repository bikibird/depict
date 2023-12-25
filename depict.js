/*
MIT License

Copyright (c) 2021-2023 Jennifer L Schmidt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var RGB=class RGB
{
	constructor(red,green,blue,picoIndex)
	{
		Object.defineProperty(this,"r",{writable: true})
		Object.defineProperty(this,"g",{writable: true})
		Object.defineProperty(this,"b",{writable: true})
		Object.defineProperty(this,"picoIndex",{value:picoIndex,writable: true})
		if (red instanceof RGB)
		{	
			this.r=red.r
			this.g=red.g
			this.b=red.b
			this.picoIndex=red.picoIndex
		}
		else
		{
			if (green==undefined)
			{
				this.r= Math.floor(red/65536)
				var green = (red % 65536)
				this.g= Math.floor(green/256)
				this.b=green % 256 
			}
			else
			{
				this.r=red
				this.g=green
				this.b=blue
			}
		}
		return this
	}
	distance (rgb)
	{
		return RGB.squareDistances[this.r][rgb.r]+RGB.squareDistances[this.g][rgb.g]+RGB.squareDistances[this.b][rgb.b]
	}
}
RGB.squareDistances=[]
for (let i=0;i<256;i++)
{
	RGB.squareDistances[i]=[]
	for (let j=0;j<256;j++)
	{
		RGB.squareDistances[i][j]=(i-j)**2
	}

}
var Colorspace=class Colorspace
{
	constructor(palette=[],shades)
	{
		//palette=palette.map(entry=>new RGB(entry))
		Object.defineProperty(this,"colors",{value:[],writable: true})
		Object.defineProperty(this,"shades",{value:shades,writable: true})
		for (let i = 0; i < palette.length-1; i++)
		{
			for (let j = i+1; j < palette.length; j++)
			{
				this.add(palette[i],palette[j],shades)
			}

		}
	}
	add(rgb1, rgb2, shades)
	{
		var divisor=shades-1
		for (let i= 0; i < divisor; i++)
		{
			this.colors.push(new Color(rgb1,rgb2,i/divisor))
		}
		this.colors.push(new Color(rgb1,rgb2,1))
	}
	nearest(rgb)
	{
		var nearestIndex=0
		var nearestDistance=rgb.distance(this.colors[nearestIndex].rgb)
		for (let i=1; i<this.colors.length; i++)
		{
			var distance=rgb.distance(this.colors[i].rgb)
			if (distance<nearestDistance)
			{
				nearestIndex=i
				nearestDistance=distance
			}
		}
		return this.colors[nearestIndex]
	}
}
var Color=class Color
{
	constructor(rgb1, rgb2, blend)
	{
		Object.defineProperty(this,"rgb1",{value:rgb1,writable: true})
		Object.defineProperty(this,"rgb2",{value:rgb2,writable: true})
		Object.defineProperty(this,"blend",{value:blend,writable: true})
		
		var rgb=new RGB()
		rgb.r=Math.floor(rgb1.r+(rgb2.r-rgb1.r)*blend+.5)
		rgb.g=Math.floor(rgb1.g+(rgb2.g-rgb1.g)*blend+.5)
		rgb.b=Math.floor(rgb1.b+(rgb2.b-rgb1.b)*blend+.5)  
		Object.defineProperty(this,"rgb",{value:rgb,writable: true})
	}
}
var Picture =  class Picture
{
	constructor(context, width, height)
	{
		Object.defineProperty(this,"pixels",{value:context.getImageData(0, 0, width, height),writable: true})		
		Object.defineProperty(this,"width",{value:width,writable: true})				
		Object.defineProperty(this,"height",{value:height,writable: true})
	}
	rgb(x,y)
	{
		var i=(x + y * this.width) * 4
		return new RGB(this.pixels.data[i],this.pixels.data[i+1],this.pixels.data[i+2])
	}
	set(x,y,rgb)
	{
		var i=(x + y * this.width) * 4
		this.pixels.data[i]=rgb.r 
		this.pixels.data[i+1]=rgb.g
		this.pixels.data[i+2]=rgb.b
		return this
	}
}
var depict =function depict({original,palette,filter,size,diffusion}={})
{
	var depiction=document.createElement("canvas")
	var preview=document.createElement("canvas")
	var colorsUsed=new Set()
	var aspect=original.width/original.height
	if (original.width>original.height)
	{
		if(original.width>size)
		{
			var width=size
			var height=Math.floor(size/aspect)	
		}
		else 
		{
			var width=original.width
			var height=original.height		
		}
	}
	else
	{
		if(original.height>size)
		{
			var height=size
			var width=Math.floor(size*aspect)
		}
		else 
		{
			var width=original.width
			var height=original.height		
		}
	}
	depiction.width = width
	depiction.height = height
	depictionContext = depiction.getContext("2d")
	depictionContext.drawImage(original, 0, 0, width, height)
	var size=filter.matrix.length
	var colorspace=new Colorspace(palette,size**2+1)
	var ditherRGB
	var picture = new Picture(depictionContext, width, height)
	var pixel, nearestColor,threshold
	var matrix=filter.matrix
	var redError, greenError, blueError
	var ex,ey
	for (let y = 0; y < picture.height; y++)
	{
		for (let x = 0; x <picture.width; x++)
		{
			pixel=picture.rgb(x,y)
			nearestColor=colorspace.nearest(pixel)
			
			threshold=matrix[x%size][y%size]
			if (nearestColor.blend>=threshold)
			{
				picture.set(x,y,nearestColor.rgb2)
				ditherRGB=nearestColor.rgb2
			}
			else
			{
				picture.set(x,y,nearestColor.rgb1)
				ditherRGB=nearestColor.rgb1
			}
			redError=pixel.r-ditherRGB.r
			greenError=pixel.g-ditherRGB.g
			blueError=pixel.b-ditherRGB.b
			colorsUsed.add(ditherRGB.picoIndex)
			filter.corrections.forEach(point=>
			{
				ex=x+point.x
				ey=y+point.y
				if (ex>-1)
				{
					eRGB=picture.rgb(ex,ey)

					eRGB.r=Math.min(Math.max(eRGB.r +Math.floor(redError*diffusion * point.amount+.5), 0), 255)
					eRGB.g=Math.min(Math.max(eRGB.g + Math.floor(greenError*diffusion * point.amount+.5), 0), 255)
					eRGB.b=Math.min(Math.max(eRGB.b + Math.floor(blueError*diffusion * point.amount+.5), 0), 255)
					picture.set(ex,ey,eRGB)
				}	
			})
		}
	}
	depictionContext.putImageData(picture.pixels, 0, 0)
	var scale=4
	preview.width=width*scale
	preview.height=height*scale
	
	var previewContext=preview.getContext("2d")
	var previewData=previewContext.getImageData(0, 0, preview.width, preview.height)
	var i,j
	for (let y=0;y<preview.height;y++)
	{
		for (let x=0;x<preview.width;x++)
		{
			i=(x + y * preview.width) * 4
			j=(Math.floor(x/scale) + Math.floor(y/scale)*picture.pixels.width)*4
			previewData.data[i]=picture.pixels.data[j]
			previewData.data[i+1]=picture.pixels.data[j+1]
			previewData.data[i+2]=picture.pixels.data[j+2]
			previewData.data[i+3]=picture.pixels.data[j+3]
		}
	}
	previewContext.putImageData(previewData, 0, 0)
	return {depiction:depiction,preview:preview, colorsUsed:[...colorsUsed].sort((a,b)=>a-b)}
}
var filters={}
filters["Solid"]={
	matrix:[[1/2]],
	corrections:[],
	default:false
}
filters["5 Shade Dither"]={
	matrix:[
		[1/5,3/5],
		[4/5,2/5]
	],
	corrections:[],
	default:false
}
filters["10 Shade Dither"]={
	matrix:[
		[3/10,7/10,4/10],
		[6/10,1/10,9/10],
		[2/10,8/10,5/10]
	],
	corrections:[],
	default:false
}
filters["17 Shade Dither"]={
	matrix:[
		[1/17,9/17,3/17,11/17],
		[13/17,5/17,15/17,7/17],
		[4/17,12/17,2/17,10/17],
		[16/17,8/17,14/17,6/17]
	],
	corrections:[],
	default:true
}
filters["Atkinson"]={
	matrix:[[1/2]],
	corrections:[
		{x:1,y:0,amount:1/8},
		{x:2,y:0,amount:1/8},
		{x:-1,y:1,amount:1/8},
		{x:0,y:1,amount:1/8},
		{x:1,y:1,amount:1/8},
		{x:0,y:2,amount:1/8},
	],
	default:false
}
filters["Floyd-Steinberg"]={
	matrix:[[1/2]],
	corrections:[
		{x:1,y:0,amount:7/16},
		{x:-1,y:1,amount:3/16},
		{x:0,y:1,amount:5/16},
		{x:1,y:1,amount:1/16}
	],
	default:false
}
filters["Sierra2"]={
	matrix:[[1/2]],
	corrections:[
		{x:1,y:0,amount:4/16},
		{x:2,y:0,amount:3/16},
		{x:-2,y:1,amount:1/16},
		{x:-1,y:1,amount:2/16},
		{x:0,y:1,amount:3/16},
		{x:1,y:1,amount:2/16},
		{x:2,y:1,amount:1/16},
	],
	default:false
}
filters["Rivers"]={
	matrix:[[1/2]],
	corrections:[
		{x:-1,y:1,amount:1/3},
		{x:0,y:1,amount:1/3},
		{x:1,y:1,amount:1/3}
	],
	default:false
}
filters["Streets"]={
	matrix:[[1/2]],
	corrections:[
		{x:1,y:0,amount:1/4},
		{x:-1,y:1,amount:1/4},
		{x:0,y:1,amount:1/4},
		{x:1,y:1,amount:1/4}
	],
	default:false
}
filters["Rain"]={
	matrix:[[1/2]],
	corrections:[
		{x:1,y:0,amount:1/2},
		{x:1,y:1,amount:1/2},
	],
	default:false
}
filters["Wind"]={
	matrix:[[1/2]],
	corrections:[
		{x:1,y:0,amount:2/12},
		{x:2,y:0,amount:1/12},
		{x:0,y:1,amount:2/12},
		{x:1,y:1,amount:2/12},
		{x:2,y:1,amount:1/12},
		{x:-1,y:2,amount:1/12},
		{x:0,y:2,amount:1/12},
		{x:1,y:2,amount:1/12},
		{x:2,y:2,amount:1/12}
	],
	default:false
}

filters["Lightning"]={  
	matrix:[[1/2]],
	corrections:[
		{x:1,y:1,amount:1},
	],
	default:false
}

