class Terrain extends CGFobject{
    
    constructor(scene,texture,heightmap,parts,heightscale){
        super(scene);
        this.scene = scene;
        this.texture = new CGFtexture(this.scene, "./scenes/images/metal.png");
        this.heightmap = heightmap;
        this.parts = parts;
        this.heightscale = heightscale;
        this.plane = new Plane(scene,parts,parts);

        this.testShader = new CGFshader(this.scene.gl,"vertexShader.vert", "fragShader.frag");
        
        this.testShader.setUniformsValues({USampler2: 1});
        this.testShader.setUniformsValues({normScale: this.heightscale});

  
    }



    display(){
        this.scene.setActiveShader(this.testShader);
        this.texture.bind(1);
        this.plane.display();
        this.scene.setActiveShader(this.scene.defaultShader);
    }
}