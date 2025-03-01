/**
 * MySphere 
 * @param gl {WebGLRenderingContext}
 * @constructor
 */

 /**
  * MySphere class is used to represent spheres
  */
class MySphere extends CGFobject
{
	/**
	 * Class constructor for MySphere
	 * @param {*} scene Scene where the object will be displayed
	 * @param {*} slices Number of slices of the sphere
	 * @param {*} stacks Number of stacks of the sphere
	 * @param {*} radius The radius of the sphere
	 */
	constructor(scene, slices, stacks, radius)
	{
		super(scene);

		this.slices = slices;
		this.stacks = stacks;
		this.radius = radius;
		this.initBuffers();
	};

	/**
	 * Function used to define the vertices, indices, normals and texture coordinates for the object
	 */
	initBuffers()
	{
		this.vertices = [
		];

		this.indices = [
		];

		this.normals = [
		];

		this.texCoords = [
		];


		var angle = Math.PI*4/(this.slices);
		var delta = Math.PI*4/(this.stacks);
		var alpha = 0;
		var radius = 0;
		var newangle = 0;
		var x = 0;
		var y = 0;
		var z = 0;

		var count = 0;
		var v = 0;
		while(count < this.slices)
		{
			v = 0;
			newangle = 0;
			
			for(var i = 0; i <= this.stacks; i++)
			{
				
				radius = Math.cos(newangle);

				x = this.radius*radius*Math.cos(alpha);
				y = this.radius*radius*Math.sin(alpha);
				z = this.radius*Math.sin(newangle);
				this.vertices.push(x);
				this.vertices.push(y);
				this.vertices.push(z);

				newangle = newangle + delta/2;
			}
	
			newangle = 0;

			for(var i = 0; i <= this.stacks; i++)
			{
				radius = Math.cos(newangle);
				x = radius*Math.cos(alpha);
				y = radius*Math.sin(alpha);
				this.normals.push(x);
				this.normals.push(y);
				this.normals.push(0);
				newangle = newangle + delta/2;

			}

			alpha = alpha + angle;
			count++;
		}

		for (var i = 0; i < this.slices*(this.stacks+1); i+=(this.stacks+1))
		{

			if(i == (this.slices-1)*(this.stacks+1))
			{
				for(var j = 0; j < this.stacks; j++)
				{

					this.indices.push(j+1);
					this.indices.push(i+j);
					this.indices.push(j);



					this.indices.push(1+j);
					this.indices.push(i+j+1);
					this.indices.push(j+i);
				}
			}
			else
			{
				for(var j = 0; j < this.stacks; j++)
				{					
					
					this.indices.push(i+j);
					this.indices.push(i+j+this.stacks+1);
					this.indices.push(i+j+this.stacks+1+1);
					
					this.indices.push(i+j+this.stacks+1+1);
					this.indices.push(i+j+1);
					this.indices.push(i+j);

					

				}
			}

		}
	
		newangle = 0;
		alpha = 0;
		var newangleTemp = 0;

		for(var j = 0; j < this.slices; j++)
		{
			for(var i = 0; i <= this.stacks;i++)
			{
				x =  0.5 -0.5*Math.cos(alpha) * Math.cos(newangle);
				y = 0.5-  0.5*Math.sin(alpha) * Math.cos(newangle);

				this.texCoords.push(x);
				this.texCoords.push(y);

				newangle = newangle + delta/2.0;
			}
			newangleTemp += angle;
			alpha += angle;
			newangle = 0;	
		}
		
		this.primitiveType=this.scene.gl.TRIANGLES;
		this.initGLBuffers();
	};

	/**
	 * Function used to display the sphere in member scene
	 */
	display()
	{
		this.scene.pushMatrix();
		this.scene.rotate(Math.PI/2,1,0,0);
		super.display();
		this.scene.popMatrix();
	};
};