/*
MIT License

Copyright (c) 2021 Jennifer L Schmidt

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
	constructor(red,green,blue)
	{
		Object.defineProperty(this,"r",{writable: true})
		Object.defineProperty(this,"g",{writable: true})
		Object.defineProperty(this,"b",{writable: true})
		if (red instanceof RGB)
		{	
			this.r=red.r
			this.g=red.g
			this.b=red.b
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
	constructor(palette=[],shades=17)
	{
		Object.defineProperty(this,"colors",{value:[],writable: true})
		Object.defineProperty(this,"shades",{value:shades,writable: true})
		Object.defineProperty(this,"palette",{value:palette.map(entry=>new RGB(entry)),writable: true})
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
		if (!(rgb1 instanceof RGB))
		{
			rgb1=new RGB(rgb1)
		}
		if (!(rgb2 instanceof RGB))
		{
			rgb2=new RGB(rgb2)
		}
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
	nearestPaletteEntry(rgb)
	{
		var nearestIndex=0
		var nearestDistance=rgb.distance(this.palette[nearestIndex])
		for (let i=1; i<this.palette.length; i++)
		{
			var distance=rgb.distance(this.palette[i])
			if (distance<nearestDistance)
			{
				nearestIndex=i
				nearestDistance=distance
			}
		}
		return this.palette[nearestIndex]
	}
	quantize(...args)
	{
		var {context,cap}=args[0]
		var {data:pixels,width, height}=context.getImageData(0, 0, context.canvas.width, context.canvas.height)
		var paintPots=[]
		for(let j=0;j<cap;j++)
		{
			var i=Math.floor(Math.random()*width*4*height+Math.random()*width*4)
			paintPots[j]={rgb:new RGB(pixels[i],pixels[i+1],pixels[i+2]),drops:1}
		}
		function mix(paintPots)
		{
			var paints=[]
			for (let j=0;j<paintPots.length;j++)
			{
				paints[j]={rgb:new RGB(paintPots[j].rgb),drops:1}
			}
			for(let y=0;y<height;y++)
			{
				for(let x=0;x<width;x++)
				{
					var i=width*4*y+x*4
					var nearestDistance=Infinity
					var nearestIndex=0
					var distance
					var pixel=new RGB(pixels[i],pixels[i+1],pixels[i+2])
					for (let j=0;j<paints.length;j++)
					{
						distance=paints[j].rgb.distance(pixel)
						if (distance<nearestDistance)
						{
							nearestIndex=j
							nearestDistance=distance
						}
					}
					var drops=paints[nearestIndex].drops
					var divisor=drops+1
					var paint=paints[nearestIndex].rgb
					paint.r=Math.floor(((paint.r*drops+pixel.r)/divisor)+.5)
					paint.g=Math.floor(((paint.g*drops+pixel.g)/divisor)+.5)
					paint.b=Math.floor(((paint.b*drops+pixel.b)/divisor)+.5)
					paints[nearestIndex].drops++
				}	
			}
			return paints
		}
		var done=false
		var tempPaintPots
		while(!done)
		{
			tempPaintPots=mix(paintPots)
			done=true
			for (let j=0;j<paintPots.length;j++)
			{
				if(paintPots[j].rgb.r!=tempPaintPots[j].rgb.r || paintPots[j].rgb.g!=tempPaintPots[j].rgb.g || paintPots[j].rgb.b!=tempPaintPots[j].rgb.b)
				{
					done=false
					paintPots=tempPaintPots
				}
			}
		}
		//match paintpots to nearests colors in colorspace
		var colors=[]
		for (let j=0;j<paintPots.length;j++)
		{
			var color=this.nearestPaletteEntry(paintPots[j].rgb)
			colors.push(color)
			/*if (color.blend===0)
			{
				colors.push(color.rgb1)
			}
			else
			{
				if (color.blend===1)
				{
					colors.push(color.rgb2)
				}
				else
				{
					colors.push(color.rgb1)
					colors.push(color.rgb2)
				}
			} */
		}
		return new Colorspace(colors,this.shades)
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
		Object.defineProperty(this,"original",{value:this.pixels,writable: true})
		Object.defineProperty(this,"width",{value:width,writable: true})				
		Object.defineProperty(this,"height",{value:height,writable: true})
	}
	revert()
	{
		this.pixels=this.original
		return this
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

	crop(x,y,width,height)
	{

	}
	mirror()
	{

	}
	flip()
	{

	}
	resize()
	{

	}
}
var depict =function depict({original,palette,filter,cap}={})
{
	var depiction=document.createElement("canvas")
	var preview=document.createElement("canvas")
	
	var aspect=original.width/original.height
	if (original.width>original.height)
	{
		if(original.width>128)
		{
			var width=128
			var height=Math.floor(128/aspect)	
		}
		else 
		{
			var width=original.width
			var height=original.height		
		}
	}
	else
	{
		if(original.height>128)
		{
			var height=128
			var width=Math.floor(128*aspect)
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

	var colorspace=new Colorspace(palette,filter.shades)
/*	for (let i = 0; i < palette.length-1; i++)
	{
		for (let j = i+1; j < palette.length; j++)
		{
			colorspace.add(palette[i],palette[j],filter.shades)
		}
	}
*/	
	if (palette.length>cap){colorspace=colorspace.quantize({context:depictionContext,cap:cap})}

	var ditherRGB
	var picture = new Picture(depictionContext, width, height)

	for (let y = 0; y < picture.height; y++)
	{
		for (let x = 0; x <picture.width; x++)
		{
			var pixel=picture.rgb(x,y)
			var nearestColor=colorspace.nearest(pixel)
			var threshold=filter.grid[x%filter.size][y%filter.size]
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
			var redError=pixel.r-ditherRGB.r
			var greenError=pixel.g-ditherRGB.g
			var blueError=pixel.b-ditherRGB.b
			var ex,ey
			filter.corrections.forEach(point=>
			{
				ex=x+point.x
				ey=y+point.y
				if (ex>-1)
				{
					eRGB=picture.rgb(ex,ey)

					eRGB.r=Math.min(Math.max(eRGB.r +Math.floor(redError * point.amount +.5), 0), 255)
					eRGB.g=Math.min(Math.max(eRGB.g + Math.floor(greenError * point.amount +.5), 0), 255)
					eRGB.b=Math.min(Math.max(eRGB.b + Math.floor(blueError * point.amount +.5), 0), 255)
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
	return {depiction:depiction,preview:preview}
}
var filters={}
filters["Solid"]={
	shades:2,
	size:1,
	grid:[[1/2]],
	corrections:[],
	default:false
}
filters["5 Shade Dither"]={
	shades:5,
	size:2,
	grid:[
		[1/5,3/5],
		[4/5,2/5]
	],
	corrections:[],
	default:false
}
filters["10 Shade Dither"]={
	shades:10,
	size:3,
	grid:[
		[3/10,7/10,4/10],
		[6/10,1/10,9/10],
		[2/10,8/10,5/10]
	],
	corrections:[],
	default:false
}
filters["17 Shade Dither"]={
	shades:17,
	size:4,
	grid:[
		[1/17,9/17,3/17,11/17],
		[13/17,5/17,15/17,7/17],
		[4/17,12/17,2/17,10/17],
		[16/17,8/17,14/17,6/17]
	],
	corrections:[],
	default:true
}
filters["Atkinson"]={
	shades:2,
	size:1,
	grid:[[1/2]],
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
	shades:2,
	size:1,
	grid:[[1/2]],
	corrections:[
		{x:1,y:0,amount:7/16},
		{x:-1,y:1,amount:3/16},
		{x:0,y:1,amount:5/16},
		{x:1,y:1,amount:1/16}
	],
	default:false
}
filters["Sierra2"]={
	shades:2,
	size:1,
	grid:[[1/2]],
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

