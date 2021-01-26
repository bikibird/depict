class filter
{
	constructor({name,grid,difusion}={})
	{
		Object.defineProperty(this,"name",{ value: name,writable: true})
		Object.defineProperty(this,"grid",{ value: pattern,writable: true})
		Object.defineProperty(this,"difusion",{ value: difusion,writable: true})
	}
}
var filters=[]
var colorSpace
var palette=[0x000000,0x103052,0x852e52,0x008557,0xe4523c,0x615751, 0xc0c2c5, 0xfffde8, 0xff00fd,0xff9f33, 0xffe951, 0x00e155, 0x00aefa, 0x837698, 0xff77af, 0xffcaac]
filters.push(new filter({
	name:"cross-hatch 2x2",
	grid:[
		[0,.5],
		[.75,1]
	],
	difusion:false
}))
filters.push(new filter({
	name:"cross-hatch 4x4",
	grid:[
		[0,.5,.125,.625 ],
		[.75,.25,.825,.375],
		[.1875, .6875, .0625, .5625 ],
		[.9375, .4375, .8125, .3125 ]
	],
	difusion:false
}))
var activeFilter = filters[0]
