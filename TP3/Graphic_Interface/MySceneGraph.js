// Order of the groups in the XML document.
var SCENE_INDEX = 0;
var VIEWS_INDEX = 1;
var AMBIENT_INDEX = 2;
var LIGHTS_INDEX = 3;
var TEXTURES_INDEX = 4;
var MATERIALS_INDEX = 5;
var TRANSFORMATIONS_INDEX = 6;
var ANIMATIONS_INDEX = 7;
var PRIMITIVES_INDEX = 8;
var COMPONENTS_INDEX = 9;
var INHERIT = "inherit";
var NONE = "none";
var DEFAULT_MATERIAL = 0;

/**
* MySceneGraph class, representing the scene graph.
*/
class MySceneGraph {
    /**
     * Class constructor for MySceneGraph
     * @constructor
     */
    constructor(filename, scene) {
        this.loadedOk = null;

        // Establish bidirectional references between scene and graph.
        this.scene = scene;
        scene.graph = this;

        this.nodes = [];

        this.idRoot = null;                    // The id of the root element.

        this.axisCoords = [];
        this.axisCoords['x'] = [1, 0, 0];
        this.axisCoords['y'] = [0, 1, 0];
        this.axisCoords['z'] = [0, 0, 1];

        // File reading 
        this.reader = new CGFXMLreader();

        /*
        * Read the contents of the xml file, and refer to this class for loading and error handlers.
        * After the file is read, the reader calls onXMLReady on this object.
        * If any error occurs, the reader calls onXMLError on this object, with an error message
        */

        this.reader.open('scenes/' + filename, this);
    }


    onXMLReady() {
        this.log("XML Loading finished.");
        var rootElement = this.reader.xmlDoc.documentElement;

        // Here should go the calls for different functions to parse the various blocks
        var error = this.parseXMLFile(rootElement);

        if (error != null) {
            this.onXMLError(error);
            return;
        }

        this.loadedOk = true;

        // As the graph loaded ok, signal the scene so that any additional initialization depending on the graph can take place
        this.scene.onGraphLoaded();
    }

    /**
    * Parses the XML file, processing each block.
    * @param {Object} rootElement XML root element
    * @returns {Object} Null or string containing appropriate error message
    */
    parseXMLFile(rootElement) {
        if (rootElement.nodeName != "yas")
            return "root tag <yas> missing";

        var nodes = rootElement.children;

        // Reads the names of the nodes to an auxiliary buffer.
        var nodeNames = [];

        for (var i = 0; i < nodes.length; i++) {
            nodeNames.push(nodes[i].nodeName);
        }

        var error;
        var index;
        // Processes each node, verifying errors.

        // <scene>
        error = this.parseIndex(SCENE_INDEX, this.parseScene, nodeNames, nodes, "scene");
        if (error != null)
            return error;

        // <views>
        error = this.parseIndex(VIEWS_INDEX, this.parseViews, nodeNames, nodes, "views");
        if (error != null)
            return error;

        // <ambient>
        error = this.parseIndex(AMBIENT_INDEX, this.parseAmbient, nodeNames, nodes, "ambient");
        if (error != null)
            return error;

        // <lights>
        error = this.parseIndex(LIGHTS_INDEX, this.parseLights, nodeNames, nodes, "lights");
        if (error != null)
            return error;

        // <textures>
        error = this.parseIndex(TEXTURES_INDEX, this.parseTextures, nodeNames, nodes, "textures");
        if (error != null)
            return error;

        // <materials>
        error = this.parseIndex(MATERIALS_INDEX, this.parseMaterials, nodeNames, nodes, "materials");
        if (error != null)
            return error;

        // <transformations>
        error = this.parseIndex(TRANSFORMATIONS_INDEX, this.parseTransformations, nodeNames, nodes, "transformations");
        if (error != null)
            return error;

        // <animations>
        error = this.parseIndex(ANIMATIONS_INDEX, this.parseAnimations, nodeNames, nodes, "animations");
        if (error != null)
            return error;

        // <primitives>
        error = this.parseIndex(PRIMITIVES_INDEX, this.parsePrimitives, nodeNames, nodes, "primitives");
        if (error != null)
            return error;

        // <components>
        error = this.parseIndex(COMPONENTS_INDEX, this.parseComponents, nodeNames, nodes, "components");
        if (error != null)
            return error;
    }

    /**Suzy
     * Parses the block specifie by the given information
     * @param {Object} parseIndex Expected index of the tag
     * @param {Object} parseFunction Function called to parse the block
     * @param {Object} nodeNames Name of the node where the tag is being searched
     * @param {Object} nodes Nodes of the scene graph
     * @param {Object} tag Block name
     * @returns {Object} Null or string containing appropriate error message
     */
    parseIndex(parseIndex, parseFunction, nodeNames, nodes, tag) {

        var index;
        var error;
        if ((index = nodeNames.indexOf(tag)) == -1)
            return "tag <" + tag + "> missing";
        else {
            if (index != parseIndex)
                this.onXMLMinorError("tag <" + tag + "> out of order");

            if ((error = parseFunction.apply(this, [nodes[index]])) != null)
                return error;
        }
        return null;
    }


    /**
    * Parses the <scene> block. 
    * @param {Object} sceneNode scene block element
    * @returns {Object} Null or string containing appropriate error message
    */
    parseScene(sceneNode) {
        this.root = this.reader.getString(sceneNode, 'root');
        if (!this.validateString(this.root))
            return "unable to parse root value";

        this.axisLength = this.reader.getFloat(sceneNode, 'axis_length');

        if (!this.validateFloat(this.axisLength)) {
            this.axisLength = 10.0;
            this.onXMLMinorError("unable to parse value for axisLength; assuming 'far = 10.0'");
        }

        this.log("Parsed scene");
        return null;
    }


    /**
    * Parses the <views> block 
    * @param {Object} viewsNode views block element
    * @returns {Object} Null or string containing appropriate error message
    */
    parseViews(viewsNode) {
        var children = viewsNode.children;
        this.views = {
            default: null,
            views: []
        }
        var numViews = 0;
        var error;

        this.views.default = this.reader.getString(viewsNode, 'default');
        if (!this.validateString(this.views.default)) {
            return "unable to parse value for views default";
        }

        for (var i = 0; i < children.length; i++) {

            switch (children[i].nodeName) {
                case "perspective":
                    if ((error = this.parseViewsPerspective(children, i)) != null)
                        return error;
                    break;
                case "ortho":
                    if ((error = this.parseViewsOrtho(children, i)) != null)
                        return error;
                    break;
                default:
                    this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                    continue;
            }
            numViews++;
        }

        if (numViews == 0)
            return "at least one view must be defined";

        error = this.validateViewsDefaultValue();
        if (error != null)
            return error;
        this.log("Parsed views");
        return null;
    }

    /**
     * Parses one child of the <views> block of type perspective
     * @param {Object} children Children of the <views> block
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseViewsPerspective(children, index) {
        var grandChildren = [];
        var perspective = {
            near: null,
            far: null,
            angle: null,
            fromPosition: [],
            toPosition: []
        }
        var error;
        //get the id of current perspective
        var perspectiveId = this.reader.getString(children[index], 'id');
        if (!this.validateString(perspectiveId))
            return "no ID defined for view";

        // Checks for repeated IDs.
        if (this.views.views[perspectiveId] != null)
            return "ID must be unique for each view (conflict: ID = " + perspectiveId + ")";

        //get the near value of current perspective
        perspective.near = this.reader.getFloat(children[index], 'near');
        if (!this.validateFloat(perspective.near))
            return "unable to parse near value for perspective for ID" + perspectiveId;

        //get the far value of current perspective
        perspective.far = this.reader.getFloat(children[index], 'far');
        if (!this.validateFloat(perspective.far))
            return "unable to parse far value for perspective for ID" + perspectiveId;

        if (perspective.near >= perspective.far)
            return "near value most be less then far value for perspective for ID " + perspectiveId;

        //get the angle value of current perspective
        perspective.angle = this.reader.getFloat(children[index], 'angle');
        if (!this.validateFloat(perspective.angle))
            return "unable to parse angle value for perspective for ID" + perspectiveId;

        grandChildren = children[index].children;
        if (grandChildren.length != 2)
            return "incorrect number of children for perspective";

        var nodeNames = [];
        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        var fromIndex = nodeNames.indexOf("from");
        var toIndex = nodeNames.indexOf("to");

        if (fromIndex == -1)
            return "perspective's from position undefined for ID  " + perspectiveId;

        if (toIndex == -1)
            return "perspective's to position undefined for ID  " + perspectiveId;

        //reads the from position
        error = this.parseAndValidateXYZvalues(grandChildren, fromIndex, perspectiveId, "from", "perspective", perspective.fromPosition);
        if (error != null)
            return error;
        //reads the to position
        this.parseAndValidateXYZvalues(grandChildren, toIndex, perspectiveId, "to", "perspective", perspective.toPosition);
        if (error != null)
            return error;

        this.views.views[perspectiveId] = this.createCameraPerspective(perspective);

        return null;
    }

    /**
     * Parses one child of the <views> block of type ortho
     * @param {Object} children Children of the <views> block
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseViewsOrtho(children, index) {
        var grandChildren = [];
        var ortho = {
            near: null,
            far: null,
            left: null,
            right: null,
            top: null,
            bottom: null,
            fromPosition: [],
            toPosition: []
        }

        var error;
        //get the id of current ortho
        var orthoId = this.reader.getString(children[index], 'id');
        if (!this.validateString(orthoId))
            return "no ID defined for view";

        // Checks for repeated IDs.
        if (this.views.views[orthoId] != null)
            return "ID must be unique for each view (conflict: ID = " + orthoId + ")";

        //get the near value of current ortho
        ortho.near = this.reader.getFloat(children[index], 'near');
        if (!this.validateFloat(ortho.near))
            return "unable to parse near value for ortho for ID " + orthoId;

        //get the far value of current ortho
        ortho.far = this.reader.getFloat(children[index], 'far');
        if (!this.validateFloat(ortho.far))
            return "unable to parse far value for ortho for ID " + orthoId;

        if (ortho.near >= ortho.far)
            return "near value most be less then far value for ortho for ID " + orthoId;

        //get the left value of current ortho
        ortho.left = this.reader.getFloat(children[index], 'left');
        if (!this.validateFloat(ortho.left))
            return "unable to parse left value for ortho for ID " + orthoId;

        //get the right value of current ortho
        ortho.right = this.reader.getFloat(children[index], 'right');
        if (!this.validateFloat(ortho.right))
            return "unable to parse right value for ortho for ID " + orthoId;

        if (ortho.left >= ortho.right)
            return "left value most be less then right value for ortho for ID " + orthoId;

        //get the top value of current ortho
        ortho.top = this.reader.getFloat(children[index], 'top');
        if (!this.validateFloat(ortho.top))
            return "unable to parse top value for ortho for ID " + orthoId;

        //get the bottom value of current ortho
        ortho.bottom = this.reader.getFloat(children[index], 'bottom');
        if (!this.validateFloat(ortho.bottom))
            return "unable to parse bottom value for ortho for ID " + orthoId;

        if (ortho.bottom >= ortho.top)
            return "bottom value most be less then top value for ortho for ID " + orthoId;

        grandChildren = children[index].children;
        if (grandChildren.length != 2)
            return "incorrect number of children of ortho";

        var nodeNames = [];
        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        var fromIndex = nodeNames.indexOf("from");
        var toIndex = nodeNames.indexOf("to");

        if (fromIndex == -1)
            return "ortho's from position undefined for ID " + orthoId;

        if (toIndex == -1)
            return "ortho's to position undefined for ID " + orthoId;

        //reads the from position
        error = this.parseAndValidateXYZvalues(grandChildren, fromIndex, orthoId, "from", "ortho", ortho.fromPosition);
        if (error != null)
            return error;
        //reads the to position
        this.parseAndValidateXYZvalues(grandChildren, toIndex, orthoId, "to", "ortho", ortho.toPosition);
        if (error != null)
            return error;

        this.views.views[orthoId] = this.createCameraOrtho(ortho);

        return null;
    }

    /**
     * Creates a new camera of type perspective
     * @param {Object} perspective Struct which contain the information needed to generate the new perspective
     * @returns A camera with the attributes of the given argument
     */
    createCameraPerspective(perspective) {
        var camera = new CGFcamera(perspective.angle * Math.PI / 180, perspective.near, perspective.far, perspective.fromPosition, perspective.toPosition);
        return camera;
    }

    /**
     * Creates a new camera of type ortho
     * @param {Object} ortho Struct which contain the information needed to generate the new ortho
     * @returns A camera with the attributes of the given argument
     */
    createCameraOrtho(ortho) {
        var up = [0, 1, 0];
        var camera = new CGFcameraOrtho(ortho.left, ortho.right, ortho.bottom, ortho.top, ortho.near, ortho.far, ortho.fromPosition, ortho.toPosition, up);
        return camera;
    }


    /**
    * Parses the <ambient> block. 
    * @param {Object} ambientNode ambient block element
    * @returns {Object} Null or string containing appropriate error message
    */
    parseAmbient(ambientNode) {
        this.ambientAmbient = [];
        this.backgroundAmbient = [];
        var children = ambientNode.children;
        var nodeNames = [];

        for (var i = 0; i < children.length; i++)
            nodeNames.push(children[i].nodeName);

        var ambientIndex = nodeNames.indexOf("ambient");
        var backgroundIndex = nodeNames.indexOf("background");

        //get and validate the ambient values
        var { x, y, z, w } = this.parsePointRGBA(children, ambientIndex);
        if (!this.validateFloat(x)) {
            x = 0;
            this.onXMLMinorError("unable to parse r-value for ambient ambient; assuming 'r = 0'");
        }
        if (!this.validateFloat(y)) {
            y = 0;
            this.onXMLMinorError("unable to parse g-value for ambient ambient; assuming 'g = 0'");
        }
        if (!this.validateFloat(z)) {
            z = 0;
            this.onXMLMinorError("unable to parse b-value for ambient ambient; assuming 'b = 0'");
        }
        if (!this.validateFloat(w)) {
            w = 1;
            this.onXMLMinorError("unable to parse a-value for ambient ambient; assuming 'a = 1'");
        }
        this.ambientAmbient.push(x, y, z, w);

        //get and validate the backgound values
        var { x, y, z, w } = this.parsePointRGBA(children, backgroundIndex);
        if (!this.validateFloat(x)) {
            x = 0;
            this.onXMLMinorError("unable to parse r-value for ambient background; assuming 'r = 0'");
        }
        if (!this.validateFloat(y)) {
            y = 0;
            this.onXMLMinorError("unable to parse g-value for ambient background; assuming 'g = 0'");
        }
        if (!this.validateFloat(z)) {
            z = 0;
            this.onXMLMinorError("unable to parse b-value for ambient background; assuming 'b = 0'");
        }
        if (!this.validateFloat(w)) {
            w = 1;
            this.onXMLMinorError("unable to parse a-value for ambient background; assuming 'a = 1'");
        }
        this.backgroundAmbient.push(x, y, z, w);

        this.log("Parsed ambient");
        return null;
    }


    /**
    * Parses the <lights> node.
    * @param {Object} lightsNode lights block element
    * @returns {Object} Null or string containing appropriate error message
    */
    parseLights(lightsNode) {
        var children = lightsNode.children;
        this.omnis = [];
        this.spots = [];
        var numLights = 0;
        var error;
        this.lights = [];

        for (var i = 0; i < children.length; i++) {
            switch (children[i].nodeName) {
                case "omni":
                    error = this.parseLightsOmni(children, i);
                    if (error != null)
                        return error;
                    break;
                case "spot":
                    error = this.parseLightsSpot(children, i);
                    if (error != null)
                        return error;
                    break;
                default:
                    this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                    continue;
            }
            numLights++;
        }

        if (numLights == 0)
            return "at least one light must be defined";

        this.log("Parsed lights");
        //console.dir(this.lights);
        return null;
    }


    /**
     * Parses child of the <lights> node of type omni
     * @param {Object} children Children of the <lights> node
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseLightsOmni(children, index) {
        var grandChildren = [];
        var error;
        var omni = {
            class: 'omni',
            enabled: null,
            location: [],
            ambient: [],
            diffuse: [],
            specular: [],
        }
        //get the id of current light
        var omniId = this.reader.getString(children[index], 'id');
        if (!this.validateString(omniId))
            return "no ID defined for light";

        // Checks for repeated IDs.
        if (this.lights[omniId] != null)
            return "ID must be unique for each light (conflict: ID = " + omniId + ")";

        //get the enabled value of current omni
        omni.enabled = this.reader.getBoolean(children[index], 'enabled');
        if (omni.enabled == null)
            return "unable to parse enabled value for omni for ID " + omniId;

        grandChildren = children[index].children;

        var nodeNames = [];
        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        var locationIndex = nodeNames.indexOf("location");
        var ambientIndex = nodeNames.indexOf("ambient");
        var diffuseIndex = nodeNames.indexOf("diffuse");
        var specularIndex = nodeNames.indexOf("specular");

        if (locationIndex == -1)
            return "omni's location undefined for ID " + omniId;
        if (ambientIndex == -1)
            return "omni's ambient undefined for ID " + omniId;
        if (diffuseIndex == -1)
            return "omni's diffuse undefined for ID " + omniId;
        if (specularIndex == -1)
            return "omni's specular undefined for ID " + omniId;


        //reads the location values 
        error = this.parseAndValidateXYZWvalues(grandChildren, locationIndex, omniId, "location", "omni", omni.location);
        if (error != null)
            return error;
        //reads the ambient values
        this.parseAndValidateRGBAvalues(grandChildren, ambientIndex, omniId, "ambient", "omni", omni.ambient);

        //reads the diffuse values 
        this.parseAndValidateRGBAvalues(grandChildren, diffuseIndex, omniId, "diffuse", "omni", omni.diffuse);

        //reads the specular values
        this.parseAndValidateRGBAvalues(grandChildren, specularIndex, omniId, "specular", "omni", omni.specular);

        this.lights[omniId] = omni;

        return null;
    }

    /**
    * Parses child of the <lights> node of type spot
    * @param {Object} children Children of the <lights> node
    * @param {Object} index Index of the child being parsed
    * @returns {Object} Null or string containing appropriate error message
    */
    parseLightsSpot(children, index) {

        var grandChildren = [];
        var error;
        var spot = {
            class: 'spot',
            enabled: null,
            angle: null,
            exponent: null,
            location: [],
            target: [],
            ambient: [],
            diffuse: [],
            specular: [],
        }
        //get the id of current light
        var spotId = this.reader.getString(children[index], 'id');
        if (!this.validateString(spotId))
            return "no ID defined for light";

        // Checks for repeated IDs.
        if (this.lights[spotId] != null)
            return "ID must be unique for each light (conflict: ID = " + spotId + ")";

        //get the enabled value of current spot
        spot.enabled = this.reader.getBoolean(children[index], 'enabled');
        if (spot.enabled == null)
            return "unable to parse enabled value for spot for ID " + spotId;

        //get the angle value of current spot
        spot.angle = this.reader.getFloat(children[index], 'angle');
        if (!this.validateFloat(spot.angle))
            return "unable to parse angle value for spot for ID " + spotId;

        //get the exponent value of current spot
        spot.exponent = this.reader.getFloat(children[index], 'exponent');
        if (!this.validateFloat(spot.exponent))
            return "unable to parse exponent value for spot for ID " + spotId;

        grandChildren = children[index].children;
        var nodeNames = [];
        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        var locationIndex = nodeNames.indexOf("location");
        var targetIndex = nodeNames.indexOf("target");
        var ambientIndex = nodeNames.indexOf("ambient");
        var diffuseIndex = nodeNames.indexOf("diffuse");
        var specularIndex = nodeNames.indexOf("specular");

        if (locationIndex == -1)
            return "spot's location undefined for ID " + spotId;
        if (targetIndex == -1)
            return "spot's target undefined for ID " + spotId;
        if (ambientIndex == -1)
            return "spot's ambient undefined for ID " + spotId;
        if (diffuseIndex == -1)
            return "spot's diffuse undefined for ID " + spotId;
        if (specularIndex == -1)
            return "spot's specular undefined for ID " + spotId;


        //reads the location values 
        error = this.parseAndValidateXYZWvalues(grandChildren, locationIndex, spotId, "location", "spot", spot.location);
        if (error != null)
            return error;
        //reads the target values
        error = this.parseAndValidateXYZvalues(grandChildren, targetIndex, spotId, "target", "spot", spot.target);
        if (error != null)
            return error;
        //reads the ambient values
        this.parseAndValidateRGBAvalues(grandChildren, ambientIndex, spotId, "ambient", "spot", spot.ambient);

        //reads the diffuse values
        this.parseAndValidateRGBAvalues(grandChildren, diffuseIndex, spotId, "diffuse", "spot", spot.diffuse);

        //reads the specular values
        this.parseAndValidateRGBAvalues(grandChildren, specularIndex, spotId, "specular", "spot", spot.specular);

        this.lights[spotId] = spot;

        return null;
    }



    /**
     * Parses the <textures> node.
     * @param {Object} texturesNode textures block element
     * @returns {Object} Null or string containing appropriate error message
     */
    parseTextures(texturesNode) {
        var children = texturesNode.children;
        this.textures = [];
        var numTextures = 0;
        var error;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeName == "texture") {
                if ((error = this.parseTexturesTexture(children, i)) != null)
                    return error;
            }
            else {
                this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                continue;
            }
            numTextures++;
        }
        if (numTextures == 0)
            return "at least one texture must be defined";

        this.log("Parsed textures");
        return null;
    }

    /**
     * Sub function for parseTextures aids the parsing of textures by creating a CGFtexture with the characteristics of the parsed texture.
     * @param {Object} children Elements of the texture block
     * @param {Object} index Index of the element being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseTexturesTexture(children, index) {
        //get the id of current texture
        var textureId = this.reader.getString(children[index], 'id');
        if (!this.validateString(textureId))
            return "no ID defined for texture";

        // Checks for repeated IDs.
        if (this.textures[textureId] != null)
            return "ID must be unique for each texture (conflict: ID = " + textureId + ")";

        //get the enabled value of current omni
        var file = this.reader.getString(children[index], 'file');
        if (!this.validateString(file))
            return "no file defined for texture";

        var texture = new CGFtexture(this.scene, file);
        this.textures[textureId] = texture;

        return null;
    }

    /**
     * Parses the <materials> node.
     * @param {Object} materialsNode materials block element
     * @returns {Object} Null or string containing appropriate error message
     */
    parseMaterials(materialsNode) {
        var children = materialsNode.children;
        this.materials = [];
        var numMaterials = 0;
        var error;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeName == "material") {
                error = this.parseMaterialsMaterial(children, i);
                if (error != null)
                    return error;
            }
            else {
                this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                continue;
            }
            numMaterials++;
        }

        if (numMaterials == 0)
            return "at least one material must be defined";

        this.log("Parsed materials");
        return null;
    }

    /**
     * Sub function for parseMaterials aids the parsing of materials by creating a struct to store the contents of the parsed child of <materials>
     * @param {Object} children Children of the <materials> block
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseMaterialsMaterial(children, index) {
        var material = {
            shininess: null,
            emission: [],
            ambient: [],
            diffuse: [],
            specular: []
        }
        var grandChildren = [];
        //get the id of current material
        var materialId = this.reader.getString(children[index], 'id');
        if (!this.validateString(materialId))
            return "no ID defined for material";

        // Checks for repeated IDs.
        if (this.materials[materialId] != null)
            return "ID must be unique for each material (conflict: ID = " + materialId + ")";

        //get the shininess value of current material
        material.shininess = this.reader.getFloat(children[index], 'shininess');
        if (!this.validateFloat(material.shininess))
            return "unable to parse shininess value for spot for ID " + materialId;

        grandChildren = children[index].children;
        var nodeNames = [];
        for (let j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        let emissionIndex = nodeNames.indexOf("emission");
        let ambientIndex = nodeNames.indexOf("ambient");
        let diffuseIndex = nodeNames.indexOf("diffuse");
        let specularIndex = nodeNames.indexOf("specular");

        if (emissionIndex == -1)
            return "material's emission undefined for ID " + materialId;
        if (ambientIndex == -1)
            return "material's ambient undefined for ID " + materialId;
        if (diffuseIndex == -1)
            return "material's diffuse undefined for ID " + materialId;
        if (specularIndex == -1)
            return "material's specular undefined for ID " + materialId;

        //reads the emission values
        this.parseAndValidateRGBAvalues(grandChildren, emissionIndex, materialId, "emission", "ambient", material.emission);

        //reads the ambient values
        this.parseAndValidateRGBAvalues(grandChildren, ambientIndex, materialId, "ambient", "ambient", material.ambient);

        //reads the diffuse values
        this.parseAndValidateRGBAvalues(grandChildren, diffuseIndex, materialId, "diffuse", "ambient", material.diffuse);

        //reads the specular values
        this.parseAndValidateRGBAvalues(grandChildren, specularIndex, materialId, "specular", "ambient", material.specular);

        this.materials[materialId] = this.createAppearance(material);

        return null;
    }

    /**
     * Creates a new appearance with the information in the struct material received
     * @param {Object} material Struct containing the necessary information to create a new appearance
     * @returns {Object} An appearance with the characteristics of the argument given
     */
    createAppearance(material) {
        var appearance = new CGFappearance(this.scene);
        appearance.setEmission(material.emission[0], material.emission[1], material.emission[2], material.emission[3]);
        appearance.setAmbient(material.ambient[0], material.ambient[1], material.ambient[2], material.ambient[3]);
        appearance.setDiffuse(material.diffuse[0], material.diffuse[1], material.diffuse[2], material.diffuse[3]);
        appearance.setSpecular(material.specular[0], material.specular[1], material.specular[2], material.specular[3]);
        appearance.setTextureWrap('REPEAT', 'REPEAT');
        return appearance;
    }


    /**
     * Parses the <transformations> node.
     * @param {Object} transformationsNode Transformations block element
     * @returns {Object} Null or string containing appropriate error message
     */
    parseTransformations(transformationsNode) {
        var children = transformationsNode.children;
        this.transformations = [];
        var numTransformations = 0;
        var error;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeName == "transformation") {
                error = this.parseTransformationsTransformation(children, i);
                if (error != null)
                    return error;
            }
            else {
                this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                continue;
            }
            numTransformations++;
        }

        if (numTransformations == 0)
            return "at least one transformation must be defined";

        this.log("Parsed transformations");
        return null;
    }

    /**
     * Sub function for parseTransformations aids in parsing the textures by differentiating the given transformations by their type
     * @param {Object} children Children of the <transformations> block 
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseTransformationsTransformation(children, index) {
        var grandChildren = [];
        var numT = 0;
        var error;
        //get the id of current transformation
        var transformationId = this.reader.getString(children[index], 'id');
        if (!this.validateString(transformationId))
            return "no ID defined for transformation";

        // Checks for repeated IDs.
        if (this.transformations[transformationId] != null)
            return "ID must be unique for each transformation (conflict: ID = " + transformationId + ")";

        grandChildren = children[index].children;
        var nodeNames = [];
        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }
        var tmp_transformations = [];
        for (var j = 0; j < grandChildren.length; j++) {
            var nodeName = grandChildren[j].nodeName;
            switch (nodeName) {
                case "translate":
                    error = this.parseTransformationTranslate(grandChildren, j, tmp_transformations);
                    if (error != null)
                        return error;
                    break;
                case "rotate":
                    error = this.parseTransformationRotate(grandChildren, j, tmp_transformations);
                    if (error != null)
                        return error;
                    break;
                case "scale":
                    error = this.parseTransformationScale(grandChildren, j, tmp_transformations);
                    if (error != null)
                        return error;
                    break;
                default:
                    this.onXMLMinorError("unknown tag <" + grandChildren[j].nodeName + ">");
                    continue;
            }
            numT++;
        }
        if (numT == 0)
            return "at least one transformation must be defined";

        this.transformations[transformationId] = tmp_transformations;
        return null;
    }

    /**
     * Parses transformations of type scale
     * @param {Object} children Children of the <transformation> block 
     * @param {Object} index Index of the child being parsed
     * @param {Object} vector Place where the stucts representing the transformations of type scale will be stored
     * @returns {Object} Null or string containing appropriate error message
     */
    parseTransformationScale(children, index, vector) {
        var { x, y, z } = this.parsePointXYZ(children, 'x', 'y', 'z', index);
        var scale = this.createScale(x,y,z);
        if (!this.validateFloat(scale.x))
            return "unable to parse x of scale";
        if (!this.validateFloat(scale.y))
            return "unable to parse y of scale";
        if (!this.validateFloat(scale.z))
            return "unable to parse z of scale";
        vector.push(scale);
        return null;
    }

    /**
    * Parses transformations of type rotate
    * @param {Object} children Children of the <transformation> block 
    * @param {Object} index Index of the child being parsed
    * @param {Object} vector Place where the stucts representing the transformations of type rotate will be stored
    * @returns {Object} Null or string containing appropriate error message
    */
    parseTransformationRotate(children, index, vector) {  
        var axis = this.reader.getString(children[index], 'axis');
        if (!this.validateAxis(axis))
            return "unable to parse axis of rotate";
        var angle = this.reader.getFloat(children[index], 'angle');
        if (!this.validateFloat(angle))
            return "unable to parse angle of rotate";
        var rotate = this.createRotate(axis,angle,false);
        vector.push(rotate);
        return null;
    }

    /**
    * Parses transformations of type translate
    * @param {Object} children Children of the <transformation> block 
    * @param {Object} index Index of the child being parsed
    * @param {Object} vector Place where the stucts representing the transformations of type translate will be stored
    * @returns {Object} Null or string containing appropriate error message
    */
    parseTransformationTranslate(children, index, vector) {
        var { x, y, z } = this.parsePointXYZ(children, 'x', 'y', 'z', index);
        var translate = this.createTranslate(x,y,z);
        if (!this.validateFloat(translate.x))
            return "unable to parse x of translate";
        if (!this.validateFloat(translate.y))
            return "unable to parse y of translate";
        if (!this.validateFloat(translate.z))
            return "unable to parse z of translate";
        vector.push(translate);
        return null;
    }

    /**
     * Creates a struct scale that holds the information for a scale transformation
     * @param {Object} x Scale x-value
     * @param {Object} y Scale y-value
     * @param {Object} z Scale z-value
     * @returns {Object} Scale struct containing the received information
     */
    createScale(x,y,z)
    {
        var scale = {
            class: 'scale',
            x: null,
            y: null,
            z: null
        }
        scale.x = x;
        scale.y = y;
        scale.z = z;
        return scale;
    }

      /**
     * Creates a struct rotate that holds the information for a rotate transformation
     * @param {Object} axis Rotation axis 
     * @param {Object} angle Rotatio angle
     * @returns {Object} Rotate struct containing the received information
     */
    createRotate(axis,angle, rad)
    {
        var rotate = {
            class: 'rotate',
            axis: null,
            angle: null, 
            rad: null
        }
        rotate.axis = axis;
        rotate.angle = angle;
        rotate.rad = rad;
        return rotate;
    }

    /**
     * Creates a struc translate that holds the information for a translate transformation
     * @param {Object} x Translation x-coordinate
     * @param {Object} y Translation y-coordinate
     * @param {Object} z Translation z-coordinate
     * @returns {Object} Translate struct containing the received information
     */
    createTranslate(x,y,z) {
        var translate = {
            class: 'translate',
            x: null,
            y: null,
            z: null
        }
        translate.x = x;
        translate.y = y;
        translate.z = z;
        return translate;
    }

    /**
      * Parses the <animations> node.
      * @param {Object} primitivesNode Animations block element
      * @returns {Object} Null or string containing appropriate error message
      */
    parseAnimations(animationsNode) {
        var children = animationsNode.children;
        this.animations = [];
        var error;
        for (var i = 0; i < children.length; i++) {
            switch (children[i].nodeName) {
                case "linear":
                    error = this.parseAnimationLinear(children, i);
                    if (error != null)
                        return error;
                    break;
                case "circular":
                    error = this.parseAnimationCircular(children, i);
                    if (error != null)
                        return error;
                    break;
                default:
                    this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                    continue;
            }
        }

        this.log("Parsed animations");
        return null;
    }

    /**
     * Parses animations of type Linear
     * @param {Object} children Children of the <animations> block 
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseAnimationLinear(children, index) {
        var linearAnimation = {
            class: 'linear',
            span: null,
            controlpoints: []
        };
        var grandChildren = [];
        var error;
        let numControlPoints = 0;

        //get the id of current animation
        let animationId = this.reader.getString(children[index], 'id');
        if (!this.validateString(animationId))
            return "no ID defined for animation";

        // Checks for repeated IDs.   
        if (this.animations[animationId] != null)
            return "ID must be unique for each animation (conflict: ID = " + animationId + ")";

        linearAnimation.span = this.reader.getFloat(children[index], 'span');
        if (!this.validateFloat(linearAnimation.span))
            return "unable to parse span value for linear animation for ID " + animationId;

        grandChildren = children[index].children;
        var nodeNames = [];
        for (let j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        for (let i = 0; i < grandChildren.length; i++) {
            if (grandChildren[i].nodeName == "controlpoint") {
                error = this.parseAnimationLinearControlPoint(grandChildren, i, linearAnimation.controlpoints);
                if (error != null)
                    return error;
                numControlPoints++;
            }
            else {
                this.onXMLMinorError("unknown tag <" + grandChildren[i].nodeName + ">");
                continue;
            }
        }

        if (numControlPoints < 2)
            return "at least two controlpoints must be defined";

       // this.animations[animationId] = this.createLinearAnimation(linearAnimation);
       this.animations[animationId] = linearAnimation;
        return null;
    }

    /**
      * Parses animations of type Circular
      * @param {Object} children Children of the <animations> block 
      * @param {Object} index Index of the child being parsed
      * @returns {Object} Null or string containing appropriate error message
      */
    parseAnimationCircular(children, index) {
        var circularAnimation = {
            class: 'circular',
            span: null,
            centerX: null,
            centerY: null,
            centerZ: null,
            radius: null,
            startang: null,
            rotang: null
        };

        //get the id of current animation
        let animationId = this.reader.getString(children[index], 'id');
        if (!this.validateString(animationId))
            return "no ID defined for animation";

        // Checks for repeated IDs.   
        if (this.animations[animationId] != null)
            return "ID must be unique for each animation (conflict: ID = " + animationId + ")";

        circularAnimation.span = this.reader.getFloat(children[index], 'span');
        if (!this.validateFloat(circularAnimation.span))
            return "unable to parse span value for circular animation for ID " + animationId;

        let center = this.reader.getString(children[index], 'center');
        if (!this.validateString(center))
            return "unable to parse center value for circular animation for ID " + animationId;
        
        var centerS = center.split(' ');
        circularAnimation.centerX = parseFloat(centerS[0]);
        if (!this.validateFloat(circularAnimation.centerX))
             return "unable to parse center x coordinate for circular animation for ID " + animationId;
        circularAnimation.centerY = parseFloat(centerS[1]);
        if (!this.validateFloat(circularAnimation.centerY))
             return "unable to parse center y coordinate for circular animation for ID " + animationId;
        circularAnimation.centerZ = parseFloat(centerS[2]);
        if (!this.validateFloat(circularAnimation.centerZ))
             return "unable to parse center z coordinate for circular animation for ID " + animationId;  

        circularAnimation.radius = this.reader.getFloat(children[index], 'radius');
        if (!this.validateFloat(circularAnimation.radius))
            return "unable to parse radius value for circular animation for ID " + animationId;

        circularAnimation.startang = this.reader.getFloat(children[index], 'startang');
        if (!this.validateFloat(circularAnimation.startang))
            return "unable to parse startang value for circular animation for ID " + animationId;

        circularAnimation.rotang = this.reader.getFloat(children[index], 'rotang');
        if (!this.validateFloat(circularAnimation.rotang))
            return "unable to parse rotang value for circular animation for ID " + animationId;

       // this.animations[animationId] = this.createCircularAnimation(circularAnimation);

        this.animations[animationId] = circularAnimation;
        return null;
    }

    /**
    * Creates a new animation according with the animation received
    * @param {Object} animation Struct which contains the information needed to create the new animation
    * @returns {Object}  animation
    */
    createAnimation(animation) {
        switch(animation.class) {
            case 'linear' :
            return this.createLinearAnimation(animation);
            case 'circular':
            return this.createCircularAnimation(animation);
        }
    }

    /**
    * Creates a new linear animation
    * @param {Object} linearAnimation Struct which contains the information needed to create the new linear animation
    * @returns {Object} New linear animation
    */
   createLinearAnimation(linearAnimation) {
    return new LinearAnimation(linearAnimation.controlpoints, linearAnimation.span);
}


    /**
     * Creates a new circular animation
     * @param {Object} linearAnimation Struct which contains the information needed to create the new circular animation
     * @returns {Object} New circular animation
     */
    createCircularAnimation(circularAnimation) {
        return new CircularAnimation(circularAnimation.span, circularAnimation.centerX,circularAnimation.centerY,circularAnimation.centerZ,
            circularAnimation.radius,circularAnimation.startang,circularAnimation.rotang);
    }


    /**
     * Parses the <primitives> node.
     * @param {Object} primitivesNode Primitives block element
     * @returns {Object} Null or string containing appropriate error message
     */
    parsePrimitives(primitivesNode) {

        var children = primitivesNode.children;
        this.primitives = [];
        var numPrimitives = 0;
        var error;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeName == "primitive") {
                error = this.parsePrimitivesPrimitive(children, i);
                if (error != null)
                    return error;
            }
            else {
                this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
                continue;
            }
            numPrimitives++;
        }
        if (numPrimitives == 0)
            return "at least one primitive must be defined";

        this.log("Parsed primitives");
        return null;
    }

    /**
     * Sub function for parsePrimitives aids in parsing the primitives by differentiating the given primitives by their type
     * @param {Object} children Children of the <primitives> node
     * @param {Object} index  Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parsePrimitivesPrimitive(children, index) {
        var grandChildren = [];
        var error;
        var primitiveId = this.reader.getString(children[index], 'id');
        if (!this.validateString(primitiveId))
            return "no Id defined for primitive";
        if (this.primitives[primitiveId] != null)
            return "Id must be unique for each primitive  (conflict: ID = " + primitiveId + ")";

        grandChildren = children[index].children;
        var nodeNames = [];

        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }
        var nodeName = grandChildren[0].nodeName;
        switch (nodeName) {
            case "triangle":
                error = this.parseTriangle(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "rectangle":
                error = this.parseRectangle(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "cylinder":
                error = this.parseCylinder(grandChildren, 0, primitiveId,1);
                if (error != null)
                    return error;
                break;
            case "sphere":
                error = this.parseSphere(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "torus":
                error = this.parseTorus(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "plane":
                error = this.parsePlane(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "patch":
                error = this.parsePatch(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "vehicle":
                error = this.parseVehicle(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "cylinder2":
                error = this.parseCylinder2(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "terrain":
                error = this.parseTerrain(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "water":
                error = this.parseWater(grandChildren, 0, primitiveId);
                if (error != null)
                    return error;
                break;
            case "prism":
                error = this.parsePrism(grandChildren, 0, primitiveId,1);
                if (error != null)
                    return error;
                break;
            case "board":
                error = this.parseBoard(grandChildren, 0, primitiveId,1);
                if (error != null)
                    return error;
                break;
            case "piece":
                error = this.parsePiece(grandChildren, 0, primitiveId,1);
                if (error != null)
                    return error;
                break;
            default:
                this.onXMLMinorError("unknown tag <" + grandChildren[i].nodeName + ">");
                break;
        }
        return null;
    }

    /**
     * Parses the <components> node
     * @param {Object} componentsNode Components block element
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponents(componentsNode) {
        var children = componentsNode.children;
        this.components = [];
        var numComponents = 0;
        var error;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeName == "component") {
                error = this.parseComponentsComponent(children, i);
                if (error != null)
                    return error;
                numComponents++;
            }
            else
                this.onXMLMinorError("unknown tag <" + children[i].nodeName + ">");
        }
        if (numComponents == 0)
            return "at least one component must be defined";

        error = this.validateRootComponent();
        if (error != null)
            return error;
        error = this.validateComponentsChildren();
        if (error != null)
            return error;
        this.log("Parsed components");
        return null;
    }

    /**
     * Sub function for parseComponents aids in parsing the components by parsing the different elements of a component
     * @param {Object} children Children of the <components> block
     * @param {Object} index Index of the child being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentsComponent(children, index) {
        var error;
        var component = {
            materials: [],
            currentMaterialIndex: 0,
            texture: {
                id: "0",
                length_s: 0,
                length_t: 0
            },
    
            transformations : [],
            currentAnimationIndex: null, //animations are optional therefore the index can be nulls
            currentAnimationInfo : null,
            animations: [],
            children: {
                componentsRef: [],
                primitivesRef: []
            }
        }

        var grandChildren = [];
        var componentId = this.reader.getString(children[index], "id");
        if (!this.validateString(componentId))
            return "no Id defined for component";

        if (this.components[componentId] != null)
            return "Id must be unique for each component  (conflict: ID = " + componentId + ")";

        grandChildren = children[index].children;
        var nodeNames = [];

        for (var j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }
        for (var j = 0; j < grandChildren.length; j++) {

            var nodeName = grandChildren[j].nodeName;
            var ggrandChildren = grandChildren[j].children;
            switch (nodeName) {
                case "transformation":
                    error = this.parseComponentTransformations(ggrandChildren, component, componentId);
                    if (error != null)
                        return error;
                    break;
                case "animations":
                    error = this.parseComponentAnimations(ggrandChildren, component, componentId);
                    if (error != null)
                        return error;
                    break;
                case "materials":
                    error = this.parseComponentMaterials(ggrandChildren, component, componentId);
                    if (error != null)
                        return error;
                    break;
                case "texture":
                    error = this.parseComponentTexture(grandChildren, j, component, componentId);
                    if (error != null)
                        return error;
                    break;
                case "children":
                    error = this.parseComponentChildren(ggrandChildren, component, componentId);
                    if (error != null)
                        return error;
                    break;
                default:
                    this.onXMLMinorError("unknown tag <" + grandChildren[j].nodeName + ">");
                    break;
            }
        }
        this.components[componentId] = component;
        return null;
    }

    /**
     * Parses the transformations of a component
     * @param {Object} children Children of the <component> node
     * @param {Object} component Component being parsed
     * @param {Object} componentId The id of the component being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentTransformations(children, component, componentId) {
        var error;
        for (let k = 0; k < children.length; k++) {
            let nodeName2 = children[k].nodeName;
            if (nodeName2 == "transformationref") {
                error = this.parseComponentTransformationsTransformationRef(children, k, component, componentId);
                if (error != null)
                    return error;
            }
            else {
                error = this.parseComponentTransformationsTransformation(nodeName2, children, k, component);
                if (error != null)
                    return error;
            }
        }
        return null;
    }

    /**
     * Parses the transformations of a component in the case they are reference to a previously defined transformation
     * @param {Object} children Children of the <component> node
     * @param {Object} index Index of the child being parsed
     * @param {Object} component Component being parsed
     * @param {Object} componentId The id of the component being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentTransformationsTransformationRef(children, index, component, componentId) {
        let id = this.reader.getString(children[index], 'id');
        if (!this.validateString(id))
            return "no id defined for transformation for component ID: " + componentId;
        if (!this.isTransformation(id))
            return "invalid id defined for transformation " + id + " for component ID: " + componentId;
        
        for(let i = 0; i < this.transformations[id].length; i++)
        {
            component.transformations.push(this.transformations[id][i]);
        }
    
        return null;
    }

    /**
     * Parses the transformations of a component based on their type
     * @param {Object} nodeName Type of transformation
     * @param {Object} children Children of the <component> node 
     * @param {Object} index Index of the child being parsed
     * @param {Object} component Component being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentTransformationsTransformation(nodeName, children, index, component) {
        var error;
        switch (nodeName) {
            case "translate":
                error = this.parseTransformationTranslate(children, index, component.transformations);
                if (error != null)
                    return error;
                break;
            case "rotate":
                error = this.parseTransformationRotate(children, index, component.transformations);
                if (error != null)
                    return error;
                break;
            case "scale":
                error = this.parseTransformationScale(children, index, component.transformations);
                if (error != null)
                    return error;
                break;
            default:
                this.onXMLMinorError("unknown tag <" + children[k].nodeName + ">");
                break;
        }
        return null;
    }

    

    /**
   * Parses the animations of a component
   * @param {Object} children Children of the <component> node
   * @param {Object} component Component being parsed
   * @param {Object} componentId Id of the component being parsed
   * @returns {Object} Null or string containing appropriate error message
   */
    parseComponentAnimations(children, component, componentId) {
        for (let k = 0; k < children.length; k++) {
            let nodeName = children[k].nodeName;
            if (nodeName == "animationref") {
                let id = this.reader.getString(children[k], 'id');
                if (!this.validateString(id))
                    return "no id defined for animationref for component ID: " + componentId;
                if (!this.isAnimation(id))
                    return "invalid id defined for animationref " + id + " for component ID: " + componentId;
                //component.animations.push(id);
                var animation = this.createAnimation(this.animations[id]);
                component.animations.push(animation);
            }
            else
                this.onXMLMinorError("unknown tag <" + children[k].nodeName + ">");
        }
        this.inicializeComponentCurrentAnimationIndex(component);
        return null;
    }


    /**
     * Parses the materials of a component
     * @param {Object} children Children of the <component> node
     * @param {Object} component Component being parsed
     * @param {Object} componentId Id of the component being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentMaterials(children, component, componentId) {
        for (let k = 0; k < children.length; k++) {
            let nodeName2 = children[k].nodeName;
            if (nodeName2 == "material") {
                let id = this.reader.getString(children[k], 'id');
                if (!this.validateString(id))
                    return "no id defined for material for component ID: " + componentId;
                if (!this.isMaterial(id))
                    return "invalid id defined for material " + id + " for component ID: " + componentId;
                component.materials.push(id);
            }
            else
                this.onXMLMinorError("unknown tag <" + children[k].nodeName + ">");

        }

        return null;
    }


    /**
     * Parses the texture of a component
     * @param {Object} children Children of the <component> node
     * @param {Object} index Index of the child being parsed
     * @param {Object} component Component being parsed
     * @param {Object} componentId Id of the component being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentTexture(children, index, component, componentId) {
        component.texture.id = this.reader.getString(children[index], 'id');
        if ((!this.validateString(component.texture.id)))
            return "no id defined for texture for component ID: " + componentId;
        if (!this.isTexture(component.texture.id))
            return "invalid id defined for texture " + component.texture.id + " for component ID: " + componentId;

        component.texture.length_s = this.reader.getFloat(children[index], 'length_s', false);
        if (!this.validateFloat(component.texture.length_s)) {
            if (component.texture.id == "none" || component.texture.id == "inherit")
                component.texture.length_s = 0;
            else
                return "Unable to parse texture's lenght_s value for component ID: " + componentId;
        }
        component.texture.length_t = this.reader.getFloat(children[index], 'length_t', false);
        if (!this.validateFloat(component.texture.length_t)) {
            if (component.texture.id == "none" || component.texture.id == "inherit")
                component.texture.length_t = 0;
            else
                return "Unable to parse texture's lenght_t value for component ID: " + componentId;
        }
        return null;
    }


    /**
     * Parses the children of a component(primitives and other components) 
     * @param {Object} children Children of the component being parsed
     * @param {Object} component Component being parsed
     * @param {Object} componentId Id of the component being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseComponentChildren(children, component, componentId) {
        for (let k = 0; k < children.length; k++) {
            let nodeName2 = children[k].nodeName;
            switch (nodeName2) {
                case "componentref":
                    let idC = this.reader.getString(children[k], 'id');
                    if ((!this.validateString(idC)))
                        return "no id defined for componentref for component ID: " + componentId;
                    component.children.componentsRef.push(idC);
                    break;
                case "primitiveref":
                    let idP = this.reader.getString(children[k], 'id');
                    if ((!this.validateString(idP)))
                        return "no id defined for primitiveref for component ID: " + componentId;
                    if (!this.isPrimitive(idP))
                        return "invalid id defined for primitiveref " + idP + " for component ID: " + componentId;
                    component.children.primitivesRef.push(idP);
                    break;
                default:
                    this.onXMLMinorError("unknown tag <" + children[k].nodeName + ">");
                    break;
            }
        }
        return null;
    }

    /**
     * Creates a new rectangle
     * @param {Object} rectangle Struct which contains the information needed to create the new rectangle
     * @returns {Object} New rectangle
     */
    createRectangle(rectangle) {
        return new MyRectangle(this.scene, rectangle.x1, rectangle.y1, rectangle.x2, rectangle.y2);
    }

    /**
     * Creates a new triangle
     * @param {Object} triangle Struct which contains the information needed to create the new triangle
     * @returns {Object} New triangle
     */
    createTriangle(triangle) {
        return new MyTriangle(this.scene, triangle.x1, triangle.y1, triangle.z1, triangle.x2, triangle.y2, triangle.z2, triangle.x3, triangle.y3, triangle.z3);
    }

    /**
     * Creates a new sphere
     * @param {Object} sphere Struct which contains the information needed to create the new sphere
     * @returns {Object} New sphere
     */
    createSphere(sphere) {
        return new MySphere(this.scene, sphere.slices, sphere.stacks, sphere.radius);
    }

    /**
     * Creates a new cylinder
     * @param {Object} cylinder Struct which contains the information needed to create the new cylinder
     * @returns {Object} New cylinder
     */
    createCylinder(cylinder) {
        return new MyCylinder(this.scene, cylinder.slices, cylinder.stacks, cylinder.base, cylinder.top, cylinder.height); 
    }

    /**
     * Creates a new torus
     * @param {Object} torus Struct which contains the information needed to create the new torus
     * @returns {Object} New torus
     */
    createTorus(torus) {
        return new MyTorus(this.scene, torus.inner, torus.outer, torus.slices, torus.loops);
    }
    
    /**
     * Creates a new plane
     * @param {Object} plane Struct which contains the information needed to create the new plane
     * @returns {Object} New plane
     */
    createPlane(plane) {
        return new Plane(this.scene, plane.npartsU, plane.npartsV);
    }

    /**
     * Creates a new patch
     * @param {Object} plane Struct which contains the information needed to create the new patch
     * @returns {Object} New patch
     */
    createPatch(patch) {
        return new Patch(this.scene, patch.npointsU,patch.npointsV, patch.npartsU, patch.npartsV, patch.controlpoints);
    }

    /**
     * Creates a new vehicle
     * @returns {Object} New vehicle
     */
    createVehicle() {
        return new Vehicle(this.scene);
    }

    /**
     * Creates a new cylinder2
     * @param {Object} cylinder Struct which contains the information needed to create the new cylinder2
     * @returns {Object} New cylinder
     */
    createCylinder2(cylinder) {
        return new MyCylinder2(this.scene, cylinder.slices, cylinder.stacks, cylinder.base, cylinder.top, cylinder.height);
    }

    /**
     * Creates a new terrain
     * @param {Object} plane Struct which contains the information needed to create the new terrain
     * @returns {Object} New terrain
     */
    createTerrain(terrain) {
        var texture = this.textures[terrain.idTexture];
        var map = this.textures[terrain.idheightmap];
        return new Terrain(this.scene,texture,map,terrain.parts, terrain.heightscale);
    }

    /**
     * Creates a new water
     * @param {Object} water Struct which contains the information needed to create the new water
     * @returns {Object} New water
     */
    createWater(water) {
        var texture = this.textures[water.idTexture];
        var map = this.textures[water.idwavemap];
        return new Water(this.scene,texture,map,water.parts, water.heightscale,water.texscale);
    }

    /**
     * Creates a new prism
     * @param {Object} prism Struct which contains the information needed to create the new prism
     * @returns {Object} New cylinder
     */
    createPrism(prism) {
        return new MyPrism(this.scene, prism.slices, prism.stacks, prism.height, prism.radius); 
    }

    /**
     * Creates a new board
     * @returns {Object} New board
     */
    createBoard(board) {
        var boardTexture = this.textures[board.idBoardTexture];
        var cellTexture = this.textures[board.idCellTexture];
        return new MyBoard(this.scene,boardTexture,cellTexture);
    }

     /**
     * Creates a new piece
     * @returns {Object} New piece
     */
    createPiece(){
        return new Piece(this.scene);
    }


    /**
     * Parses grandchild of the <primitives> node of type torus
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseTorus(children, index, id) {
        var torus = {
            inner: null,
            outer: null,
            slices: null,
            loops: null
        }
        torus.inner = this.reader.getFloat(children[index], 'inner');
        if (!this.validateFloat(torus.inner))
            return "unable to parse inner of torus for ID " + id;

        torus.outer = this.reader.getFloat(children[index], 'outer');
        if (!this.validateFloat(torus.outer))
            return "unable to parse outer of torus for ID  " + id;

        torus.slices = this.reader.getFloat(children[index], 'slices');
        if (!this.validateFloat(torus.slices))
            return "unable to parse slices of torus for Id " + id;

        torus.loops = this.reader.getFloat(children[index], 'loops');
        if (!this.validateFloat(torus.loops))
            return "unable to parse loops of torus for ID " + id;

        this.primitives[id] = this.createTorus(torus);
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type sphere
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseSphere(children, index, id) {
        var sphere = {
            radius: null,
            stacks: null,
            slices: null
        }
        sphere.radius = this.reader.getFloat(children[index], 'radius');
        if (!this.validateFloat(sphere.radius))
            return "unable to parse radius of sphere for ID " + id;

        sphere.stacks = this.reader.getFloat(children[index], 'stacks');
        if (!this.validateFloat(sphere.stacks))
            return "unable to parse stacks of sphere for ID " + id;

        sphere.slices = this.reader.getFloat(children[index], 'slices');
        if (!this.validateFloat(sphere.slices))
            return "unable to parse slices of sphere for ID " + id;

        this.primitives[id] = this.createSphere(sphere);
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type cylinder
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseCylinder(children, index, id, number) {
        let n = "";
        if (number == 2)
            n = number;
        var cylinder = {
            base: null,
            top: null,
            height: null,
            stacks: null,
            slices: null
        }
        cylinder.base = this.reader.getFloat(children[index], 'base');
        if (!this.validateFloat(cylinder.base))
            return "unable to parse base of cylinder"+ n +" for ID " + id;

        cylinder.top = this.reader.getFloat(children[index], 'top');
        if (!this.validateFloat(cylinder.top))
            return "unable to parse top of cylinder"+ n +" for ID " + id;

        cylinder.height = this.reader.getFloat(children[index], 'height');
        if (!this.validateFloat(cylinder.height))
            return "unable to parse height of cylinder"+ n +" for ID " + id;

        cylinder.stacks = this.reader.getFloat(children[index], 'stacks');
        if (!this.validateFloat(cylinder.stacks))
            return "unable to parse stacks of cylinder"+ n +" for ID " + id;

        cylinder.slices = this.reader.getFloat(children[index], 'slices');
        if (!this.validateFloat(cylinder.slices))
            return "unable to parse slices of cylinder"+ n +"for ID " + id;

        switch(number) {
            case 1:
                this.primitives[id] = this.createCylinder(cylinder);
                break;
            case 2:
                this.primitives[id] = this.createCylinder2(cylinder);
                break;
            default:
                return "invalid cylinder for ID " + id;
        } 
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type rectangle
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseRectangle(children, index, id) {
        var rectangle = {
            x1: null,
            y1: null,
            x2: null,
            y2: null
        }
        rectangle.x1 = this.reader.getFloat(children[index], 'x1');
        if (!this.validateFloat(rectangle.x1))
            return "unable to parse x1 of rectangle for ID " + id;

        rectangle.y1 = this.reader.getFloat(children[index], 'y1');
        if (!this.validateFloat(rectangle.y1))
            return "unable to parse y1 of rectangle for ID " + id;

        rectangle.x2 = this.reader.getFloat(children[index], 'x2');
        if (!this.validateFloat(rectangle.x2))
            return "unable to parse x2 of rectangle for ID " + id;

        rectangle.y2 = this.reader.getFloat(children[index], 'y2');
        if (!this.validateFloat(rectangle.y2))
            return "unable to parse y2 of rectangle for ID " + id;

        this.primitives[id] = this.createRectangle(rectangle);
        return null;

    }

    /**
     * Parses grandchild of the <primitives> node of type triangle
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseTriangle(children, index, id) {
        var triangle = {
            x1: null,
            y1: null,
            z1: null,
            x2: null,
            y2: null,
            z2: null,
            x3: null,
            y3: null,
            z3: null
        }
        var { x, y, z } = this.parsePointXYZ(children, 'x1', 'y1', 'z1', index);
        triangle.x1 = x;
        triangle.y1 = y;
        triangle.z1 = z;
        if (!this.validateFloat(triangle.x1))
            return "unable to parse x1 of triangle for ID " + id;
        if (!this.validateFloat(triangle.y1))
            return "unable to parse y1 of triangle for ID " + id;
        if (!this.validateFloat(triangle.z1))
            return "unable to parse z1 of triangle for ID " + id;

        var { x, y, z } = this.parsePointXYZ(children, 'x2', 'y2', 'z2', index);
        triangle.x2 = x;
        triangle.y2 = y;
        triangle.z2 = z;
        if (!this.validateFloat(triangle.x2))
            return "unable to parse x2 of triangle for ID " + id;
        if (!this.validateFloat(triangle.y2))
            return "unable to parse y2 of triangle for ID  " + id;
        if (!this.validateFloat(triangle.z2))
            return "unable to parse z2 of triangle for ID  " + id;

        var { x, y, z } = this.parsePointXYZ(children, 'x3', 'y3', 'z3', index);
        triangle.x3 = x;
        triangle.y3 = y;
        triangle.z3 = z;
        if (!this.validateFloat(triangle.x3))
            return "unable to parse x3 of triangle for ID " + id;
        if (!this.validateFloat(triangle.y3))
            return "unable to parse y3 of triangle for ID " + id;
        if (!this.validateFloat(triangle.z3))
            return "unable to parse z3 of triangle for ID " + id;

        this.primitives[id] = this.createTriangle(triangle);
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type plane
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parsePlane(children, index, id) {
        var plane = {
            npartsU : null,
            npartsV : null
        }
        plane.npartsU = this.reader.getFloat(children[index], 'npartsU');
        if (!this.validateFloat(plane.npartsU))
            return "unable to parse npartsU of plane for ID " + id;

        plane.npartsV = this.reader.getFloat(children[index], 'npartsV');
        if (!this.validateFloat(plane.npartsV))
            return "unable to parse npartsV of plane for ID " + id;

        this.primitives[id] = this.createPlane(plane);

        return null;
    }

     /**
     * Parses grandchild of the <primitives> node of type patch
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parsePatch(children, index, id) {
        var patch = {
            npointsU : null,
            npointsV : null,
            npartsU : null,
            npartsV : null,
            controlpoints : []
        }

        patch.npointsU = this.reader.getFloat(children[index], 'npointsU');
        if (!this.validateFloat(patch.npointsU))
            return "unable to parse npointsU of patch for ID " + id;

        patch.npointsV = this.reader.getFloat(children[index], 'npointsV');
        if (!this.validateFloat(patch.npointsV))
            return "unable to parse npointsV of patch for ID " + id;

        patch.npartsU = this.reader.getFloat(children[index], 'npartsU');
        if (!this.validateFloat(patch.npartsU))
            return "unable to parse npartsU of patch for ID " + id;

        patch.npartsV = this.reader.getFloat(children[index], 'npartsV');
        if (!this.validateFloat(patch.npartsV))
            return "unable to parse npartsV of patch for ID " + id;

        var error;
        let numControlPoints = 0;
        let grandChildren = children[index].children;
        var nodeNames = [];
        for (let j = 0; j < grandChildren.length; j++) {
            nodeNames.push(grandChildren[j].nodeName);
        }

        for (let i = 0; i < grandChildren.length; i++) {
            if (grandChildren[i].nodeName == "controlpoint") {
                error = this.parsePatchControlPoint(grandChildren, i, patch.controlpoints);
                if (error != null)
                    return error;
                numControlPoints++;
            }
            else {
                this.onXMLMinorError("unknown tag <" + grandChildren[i].nodeName + ">");
                continue;
            }
        }
        if (numControlPoints != patch.npointsU*patch.npointsV)
            return "invalid number of controlpoints, the number of controlPoints in a patch must be npointsU * npointsV";

        this.primitives[id] = this.createPatch(patch);
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type vehicle
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null 
     */
    parseVehicle(children, index, id) {
        this.primitives[id] = this.createVehicle();
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type cylinder2
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseCylinder2(children, index, id) {
        return this.parseCylinder(children,index,id,2);
    }

    /**
     * Parses grandchild of the <primitives> node of type terrain
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseTerrain(children, index, id) {
        var terrain = {
            idTexture : null,
            idheightmap : null,
            parts : null,
            heightscale : null
        }

        terrain.idTexture = this.reader.getString(children[index], 'idTexture');
        if (!this.validateString(terrain.idTexture))
            return "unable to parse idTexture of terrain for ID " + id;
    
        if (!this.isTexture(terrain.idTexture))
            return "invalid isTexture of terrain for ID " + id;

        terrain.idheightmap = this.reader.getString(children[index], 'idheightmap');
        if (!this.validateString(terrain.idheightmap))
            return "unable to parse idheightmap of terrain for ID " + id;

        if (!this.isTexture(terrain.idheightmap))
            return "invalid idheightmap of terrain for ID " + id;

        terrain.parts = this.reader.getFloat(children[index], 'parts');
        if (!this.validateFloat(terrain.parts))
            return "unable to parse parts of terrain for ID " + id;

        terrain.heightscale = this.reader.getFloat(children[index], 'heightscale');
        if (!this.validateFloat(terrain.heightscale))
            return "unable to parse heightscale of terrain for ID " + id;

        this.primitives[id] = this.createTerrain(terrain);
        return null;
    }

     /**
     * Parses grandchild of the <primitives> node of type water
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parseWater(children, index, id) {
        var water = {
            idTexture : null,
            idwavemap : null,
            parts : null,
            heightscale : null,
            texscale : null,
        }

        water.idTexture = this.reader.getString(children[index], 'idTexture');
        if (!this.validateString(water.idTexture))
            return "unable to parse isTexture of water for ID " + id;
        
        if (!this.isTexture(water.idTexture))
            return "invalid idTexture of water for ID " + id;

        water.idwavemap = this.reader.getString(children[index], 'idwavemap');
        if (!this.validateString(water.idwavemap))
            return "unable to parse idwavemap of water for ID " + id;
   
        if (!this.isTexture(water.idwavemap))
            return "invalid idwavemap of water for ID " + id;

        water.parts = this.reader.getFloat(children[index], 'parts');
        if (!this.validateFloat(water.parts))
            return "unable to parse parts of water for ID " + id;

        water.heightscale = this.reader.getFloat(children[index], 'heightscale');
        if (!this.validateFloat(water.heightscale))
            return "unable to parse heightscale of water for ID " + id;

        water.texscale = this.reader.getFloat(children[index], 'texscale');
        if (!this.validateFloat(water.texscale))
            return "unable to parse texscale of water for ID " + id;

        this.primitives[id] = this.createWater(water);
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type prism
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null or string containig an appropriate error message
     */
    parsePrism(children, index, id) {
        var prism = {
            stacks: null,
            slices: null,
            height: null,
            radius: null
        }

        prism.slices = this.reader.getFloat(children[index], 'slices');
        if (!this.validateFloat(prism.slices))
            return "unable to parse slices of prism for ID " + id;
               
        prism.stacks = this.reader.getFloat(children[index], 'stacks');
        if (!this.validateFloat(prism.stacks))
            return "unable to parse stacks of prism for ID " + id;

        prism.height = this.reader.getFloat(children[index], 'height');
        if (!this.validateFloat(prism.height))
            return "unable to parse height of prism for ID " + id;

        prism.radius = this.reader.getFloat(children[index], 'radius');
        if (!this.validateFloat(prism.radius))
            return "unable to parse radius of prism for ID " + id;

        this.primitives[id] = this.createPrism(prism);
      
        return null;
    }

    /**
     * Parses grandchild of the <primitives> node of type board
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null 
     */
    parseBoard(children, index, id) {
        var board = {
            idBoardTexture : null,
            idCellTexture : null
        }

        board.idBoardTexture = this.reader.getString(children[index], 'boardTextureId');
        if (!this.validateString(board.idBoardTexture))
            return "unable to parse idBoardTexture of board for ID " + id;
        
        if (!this.isTexture(board.idBoardTexture))
            return "invalid idTexture of board for ID " + id;

        board.idCellTexture = this.reader.getString(children[index], 'cellTextureId');
        if (!this.validateString(board.idCellTexture))
            return "unable to parse idCellTexture of board for ID " + id;
   
        if (!this.isTexture(board.idCellTexture))
            return "invalid idCellTexture of board for ID " + id;

        this.primitives[id] = this.createBoard(board);
        return null;
    }

      /**
     * Parses grandchild of the <primitives> node of type piece
     * @param {Object} children GrandChildren of the <primitives> block
     * @param {Object} index Position in the children's array
     * @param {Object} id The id for the primitive being parsed
     * @returns {Object} null 
     */
    parsePiece(children, index, id) {
        this.primitives[id] = this.createPiece();
        return null;
    }


    
     /**
     * Parses a controlpoint 
     * @param {Object} children Children of the <node> node
     * @param {Object} index Index of the child being parsed
     * @param {Object} controlpoints Array to store the controlpoint information
     * @param {Object} animationId The id of the animations being parsed
     * @param {Object} s1 string containing relevant information
     * @returns {Object} Null or string containing appropriate error message
     */
    parseControlPoint(children, index, controlpoints, id, s1) {
        var controlpoint = [];
        var error = this.parseAndValidateXYZvalues(children, index, id, s1, "controlpoint", controlpoint);
        controlpoints.push(controlpoint);
        return error;
    }

    /**
     * Parses a controlpoint for a linear animation
     * @param {Object} children Children of the <animation> node
     * @param {Object} index Index of the child being parsed
     * @param {Object} controlpoints Array to store the controlpoint information
     * @param {Object} animationId The id of the animations being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parseAnimationLinearControlPoint(children, index, controlpoints, animationId) {
        return this.parseControlPoint(children, index, controlpoints, animationId, "linear animation");
    }

     /**
     * Parses a controlpoint for a patch
     * @param {Object} children Children of a patch primitve
     * @param {Object} index Index of the child being parsed
     * @param {Object} controlpoints Array to store the controlpoint information
     * @param {Object} animationId The id of the animations being parsed
     * @returns {Object} Null or string containing appropriate error message
     */
    parsePatchControlPoint(children, index, controlpoints, patchId) {
        return this.parseControlPoint(children, index, controlpoints, patchId, "patch");
    }

    /**
     * Parses the x,y and z values of a given array
     * @param {Object} vector Array containing the values to be parsed
     * @param {Object} x1 x value
     * @param {Object} y1 y value
     * @param {Object} z1 z value
     * @param {Object} index The vector's index
     * @returns {Object} Array containing the parsed values
     */
    parsePointXYZ(vector, x1, y1, z1, index) {
        var x = this.reader.getFloat(vector[index], x1);
        var y = this.reader.getFloat(vector[index], y1);
        var z = this.reader.getFloat(vector[index], z1);
        return { x, y, z };
    }


    /**
     * Parses the x,y,z and w values of a given array
     * @param {Object} vector Array containing the values to be parsed
     * @param {Object} x1 x value
     * @param {Object} y1 y value
     * @param {Object} z1 z value
     * @param {Object} w1 w value
     * @param {Object} index The vector's index
     * @returns {Object} Array containing the parsed values
     */
    parsePointXYZW(vector, x1, y1, z1, w1, index) {
        var x = this.reader.getFloat(vector[index], x1);
        var y = this.reader.getFloat(vector[index], y1);
        var z = this.reader.getFloat(vector[index], z1);
        var w = this.reader.getFloat(vector[index], w1);
        return { x, y, z, w };
    }

    /**
     * Parses the r,g,b and a values of a given array
     * @param {Object} vector Array containing the values to be parsed
     * @param {Object} index The vector's index
     * @returns {Object} Array containing the parsed values
     */
    parsePointRGBA(vector, index) {
        var { x, y, z, w } = this.parsePointXYZW(vector, 'r', 'g', 'b', 'a', index);
        return { x, y, z, w };

    }

    /**
     * Parses and validates the r,g,b and a values of a given array
     * @param {Object} children Array containing the values to be parsed
     * @param {Object} index The children's index
     * @param {Object} id Id of the structured from where the values parsed will be apart of
     * @param {Object} s1 informative string
     * @param {Object} s2 informative string
     * @param {Object} vector Array containing the parsed and validated values
     * @returns {Object} null or string containig an appropriate error message
     */
    parseAndValidateRGBAvalues(children, index, id, s1, s2, vector) {

        var { x, y, z, w } = this.parsePointRGBA(children, index);
        if (!this.isFloatInBetween(x, 0, 1)) {
            x = 0.3;
            this.onXMLMinorError("unable to parse " + s1 + " r-value of the " + s2 + " for ID " + id + " default: r = " + x);
        }
        if (!this.isFloatInBetween(y, 0, 1)) {
            y = 0.3;
            this.onXMLMinorError("unable to parse " + s1 + " g-value of the " + s2 + " for ID  " + id + " default: g = " + y);
        }
        if (!this.isFloatInBetween(z, 0, 1)) {
            z = 0.3;
            this.onXMLMinorError("unable to parse " + s1 + " b-value of the " + s2 + " for ID " + id + " default: b = " + z);
        }
        if (!this.isFloatInBetween(w, 0, 1)) {
            w = 0.3;
            this.onXMLMinorError("unable to parse " + s1 + " a-value of the " + s2 + " for ID " + id + " default: a = " + w);
        }
        vector.push(x, y, z, w);
        return null;
    }


    /**
     * Parses and validates the x,y and z values of a given array
     * @param {Object} children Array containing the values to be parsed
     * @param {Object} index The children's index
     * @param {Object} id Id of the structured from where the values parsed will be apart of
     * @param {Object} s1 informative string
     * @param {Object} s2 informative string
     * @param {Object} vector Array containing the parsed and validated values
     * @returns {Object} null or string containig an appropriate error message
     */
    parseAndValidateXYZvalues(children, index, id, s1, s2, vector) {
        var { x, y, z } = this.parsePointXYZ(children, 'x', 'y', 'z', index);
        if (!this.validateFloat(x))
            return "unable to parse " + s1 + " x-coordinate of " + s2 + " position for ID " + id;
        if (!this.validateFloat(y))
            return "unable to parse " + s1 + " y-coordinate of " + s2 + " position for ID " + id;
        if (!this.validateFloat(z))
            return "unable to parse " + s1 + " z-coordinate of " + s2 + " position for ID " + id;
        vector.push(x, y, z);
        return null;
    }

    /**
      * Parses and validates the x,y,z and w values of a given array
      * @param {Object} children Array containing the values to be parsed
      * @param {Object} index The children's index
      * @param {Object} id Id of the structured from where the values parsed will be apart of
      * @param {Object} s1 informative string
      * @param {Object} s2 informative string
      * @param {Object} vector Array containing the parsed and validated values
      * @returns {Object} null or string containig an appropriate error message
      */
    parseAndValidateXYZWvalues(children, index, id, s1, s2, vector) {
        var { x, y, z, w } = this.parsePointXYZW(children, 'x', 'y', 'z', 'w', index);
        if (!this.validateFloat(x))
            return "unable to parse " + s1 + " x-coordinate of " + s2 + " position for ID " + id;
        if (!this.validateFloat(y))
            return "unable to parse " + s1 + " y-coordinate of " + s2 + " position for ID " + id;
        if (!this.validateFloat(z))
            return "unable to parse " + s1 + " z-coordinate of " + s2 + " position for ID " + id;
        if (!this.validateFloat(w))
            return "unable to parse " + s1 + " w-coordinate of " + s2 + " position for ID " + id;
        vector.push(x, y, z, w);
        return null;
    }

    /**
     * Checks if a given value is a number
     * @param {Object} float Value to check
     * @returns {Object} standard true or false
     */
    validateFloat(float) {
        if (!(float != null && !isNaN(float)))
            return false;
        else
            return true;
    }

    /**
     * Checks if a given value is a string
     * @param {Object} string Value to check
     * @returns {Object} standard true or false
     */
    validateString(string) {
        return (typeof string === 'string' && string != null);
    }

    /**
     * Validates a given value representative of an axis
     * @param {Object} axis Value to check
     * @returns {Object} standard true or false
     */
    validateAxis(axis) {
        switch (axis) {
            case "x":
            case "X":
            case "y":
            case "Y":
            case "z":
            case "Z":
                return true;
            default:
                return false;
        }
    }

    /**
     * Validates if the passed id corresponds to an existing material in the materials array or to an INHERIT material
     * @param {Object} id The id from the material to be validated
     * @returns {Object} standard true or false
     */
    isMaterial(id) {
        switch (id) {
            case INHERIT:
                return true;
            default:
                return (this.materials[id] != null);
        }
    }

    /**
     * Validates if the passed id corresponds to an existing texture in the textures array or to an INHERIT or NONE texture
     * @param {Object} id The id from the texture to be validated
     * @returns {Object} standard true or false
     */
    isTexture(id) {
        switch (id) {
            case INHERIT:
            case NONE:
                return true;
            default:
                return (this.textures[id] != null);
        }
    }


    /**
    * Validates if the passed id corresponds to an existing component in the components array  
    * @param {Object} id The id from the component to be validated
    * @returns {Object} Standard true or false
    */
    isComponent(id) {
        return (this.components[id] != null);
    }

    /**
    * Validates if the passed id corresponds to an existing transformation in the transformations array  
    * @param {Object} id The id from the transformation to be validated
    * @returns {Object} Standard true or false
    */
    isTransformation(id) {
        return (this.transformations[id] != null);
    }


    /**
    * Validates if the passed id corresponds to an existing animation in the animations array  
    * @param {Object} id The id from the animation to be validated
    * @returns {Object} Standard true or false
    */
    isAnimation(id) {
        return (this.animations[id] != null);
    }


    /**
     * Validates if the passed id corresponds to an existing primitive in the primitives array  
     * @param {Object} id The id from the primitive to be validated
     * @returns {Object} Standard true or false
     */
    isPrimitive(id) {
        return (this.primitives[id] != null);
    }

    /**
     * Validates if the default value for the views is an existing view
     * @returns {Object} Null or string containing an appropriate error message
     */
    validateViewsDefaultValue() {
        if (this.views.views[this.views.default] == null)
            return "invalid default value for views :  " + this.views.default;
        return null;
    }

    /**
     * Validates if the root value is an existing component
     * @returns {Object} Null or string containing an appropriate error message
     */
    validateRootComponent() {
        if (this.components[this.root] == null)
            return "invalid root component ID " + this.root;
        return null;
    }

    /**
     * Validates the components componentRef children
     * @returns {Object} Null or string containing an appropriate error message
     */
    validateComponentsChildren() {
        for (let key in this.components) {
            let component = this.components[key];
            for (let i = 0; i < component.children.componentsRef.length; i++) {
                let child = component.children.componentsRef[i];
                if (!this.isComponent(child))
                    return "invalid id defined for component children " + child + " for component ID: " + key;
            }
        }
        return null;
    }

    /**
     * Initializes a component CurrentAnimationIndex to zero if the component has any animations, if not itd value stays null
     * @param {Object} component Component cointainig the CurrentAnimationIndex to initialize
     */
    inicializeComponentCurrentAnimationIndex(component) {
        if (component.animations.length > 0)
            component.currentAnimationIndex = 0;
    }


    /**
     * Checks if a value is in between two other values
     * @param {Object} float Value to check
     * @param {Object} lower Lower value
     * @param {Object} upper Upper value
     * @return Standard true or false
     */
    isInBetween(float, lower, upper) {
        return (float >= lower && float <= upper)
    }

    /**
     * Checks if a value is a number and if it is in between two other values
     * @param {Object} float Value to check
     * @param {Object} lower Lower value
     * @param {Object} upper Upper value
     * @returns Standard true or false
     */
    isFloatInBetween(float, lower, upper) {
        return (this.validateFloat(float) && this.isInBetween(float, lower, upper));
    }


    /**
    * Callback to be executed on any read error, showing an error on the console
    * @param {string} message 
    */
    onXMLError(message) {
        console.error("XML Loading Error: " + message);
        this.loadedOk = false;
    }

    /**
     * Callback to be executed on any minor error, showing a warning on the console.
     * @param {string} message
     */
    onXMLMinorError(message) {
        console.warn("Warning: " + message);
    }


    /**
     * Callback to be executed on any message.
     * @param {string} message
     */
    log(message) {
        console.log("   " + message);
    }


    /**
     * Displays the scene, processing each node, starting in the root node.
     */
    displayScene() {
        // entry point for graph rendering
        var transformations = [];
        var materials = [];
        var textures = [];
        this.visitNode(this.components[this.root], transformations, materials, textures, false, 0);

    }

    /**
     * Applies an array of transformations to the scene
     * @param {Object} transformations Array containing the transformations to be applied
     */
    applyTransformationsPush(transformations) {
        for (let i = 0; i < transformations.length; i++) {
            this.applyTransformation(transformations[i]);
        }
    }

    /**
     * Applies an array of transformations to the scene
     * @param {Object} transformations Array containing the transformations to be applied
     */
    applyTransformations(transformations) {
        for (var key in transformations) {
            this.applyTransformation(transformations[key]);
        }
    }

    /**
     * Applies the transformation given to the scene
     * @param {Object} transformation Transformation to be applied
     */
    applyTransformation(transformation) {
        switch (transformation.class) {
            case "translate":
                this.scene.translate(transformation.x, transformation.y, transformation.z);
                break;
            case "scale":
                this.scene.scale(transformation.x, transformation.y, transformation.z);
                break;
            case "rotate":
                this.applyRotate(transformation);
                break;
            default:
                this.onXMLError("invalid transformation to apply");
                break;
        }
    }
    /**
     * Applies a rotation to the scene with the given information
     * @param {Object} rotate Structer containing the necessary information to apply a rotation to the scene
     */
    applyRotate(rotate) {
        if (rotate.rad == false)
            var angle = Math.PI / 180 * rotate.angle;
        else
            angle = rotate.angle;
        switch (rotate.axis) {
            case "x":
            case "X":
                this.scene.rotate(angle, 1, 0, 0);
                break;
            case "y":
            case "Y":
                this.scene.rotate(angle, 0, 1, 0);
                break;
            case "z":
            case "Z":
                this.scene.rotate(angle, 0, 0, 1);
                break;
            default:
                this.onXMLError("Invalid axis to rotate");
                break;
        }
    }

    /**
     * Checks if a component should inherit the texture factors from its father-node
     * @param {Object} texture Texture of the component
     * @param {Object} textures All the textures parsed
     */
    checkLengthInherit(texture, textures) {
        var tmp_t = textures[textures.length - 1];
        if (texture.length_s != 0)
            tmp_t.length_s = texture.length_s;
        if (texture.length_t != 0)
            tmp_t.length_t = texture.length_t;
        if (texture.length_t == 0 && texture.length_s == 0)
            textures.push(textures[textures.length - 1]);
        else
            textures.push(tmp_t);
    }

    /**
     * Adds a texture to the texture array and updates its texture factors
     * @param {Object} texture Texture being added
     * @param {Object} textures All parsed textures
     * @param {Object} none_texture Flag to indicate if the component has texture 'none'(no texture)
     * @returns {Object} True or false for successful or unsuccessful texture push
     */
    pushTexture(texture, textures, none_texture) {
        switch (texture.id) {
            case INHERIT:
                if (!none_texture)
                    this.checkLengthInherit(texture, textures);
                else
                    return true;
                break;
            case NONE:
                return true;
            default:
                textures.push(texture);
                break;
        }
        return false;
    }

    /**
     * Pushes materials and corrects their attributes on inheritance
     * @param {Object} materials All parsed materials
     * @param {Object} node Node which contains the material
     * @param {Object} parent_currentMaterialIndex Index of the current material being used by the parent node
     * @returns true if the material was inherited false otherwise
     */
    pushMaterials(materials, node, parent_currentMaterialIndex) {
        var is_inherit = false;
        switch (node.materials[node.currentMaterialIndex]) {
            case INHERIT:
                if (node.materials.length <= 1) {
                    materials.push(materials[materials.length - 1]);
                    is_inherit = true;
                }
                else {
                    let mat = materials[materials.length - 1][parent_currentMaterialIndex];
                    let copy = node.materials;
                    copy[node.currentMaterialIndex] = mat;
                    materials.push(copy);
                }
                break;
            default:
                materials.push(node.materials);
                break;
        }
        return is_inherit;
    }

    /**
     * Applies a component animation
     * @param {Object} node Component node which contains  animation to be applied
     * @param {Object} remainingTime time to update the animation
     * @returns {Object} Structure containing the animation type and the popAnimation flag values
     */
    applyAnimation(node,remainingTime) {
        var apAnimation = {
            popAnimations : true,
            type : null,
        } 
        let animationIndex = node.currentAnimationIndex;
        //let animationId = node.animations[animationIndex];
        //let animation = this.animations[animationId];
        let animation = node.animations[animationIndex];
        animation.update(remainingTime);
        switch(animation.type){
            case "Linear" :
            this.applyAnimationLinear(animation, node);
            apAnimation.type = "Linear";
            break;
            case "Circular":
            this.applyAnimationCircular(animation,node);
            apAnimation.type = "Circular";
            break;
        }     
        if(animation.end == true)
        {
            if(animationIndex < node.animations.length -1)
            {
                animation.restart();
                node.currentAnimationIndex++;
                apAnimation.popAnimations = false;
            }
         
        }
        else
          apAnimation.popAnimations = true;

        return apAnimation;
    }

    /**
     * Applies a component circular animation
     * @param {Object} animation Animation to be applied
     * @param {Object} node Component node which contains animation to be applied
     */
    applyAnimationCircular(animation, node) {
        var animationTranslate1 = this.createTranslate(animation.x, 0, animation.z);
        var animationRotate = this.createRotate("y", -animation.angle, true);
        var animationTranslate2 = this.createTranslate(animation.centerX, animation.centerY, animation.centerZ);
        node.transformations.push(animationTranslate2);
        node.transformations.push(animationTranslate1);
        node.transformations.push(animationRotate);        
    }

    /**
     * Applies a component linear animation
     * @param {Object} animation Animation to be applied
     * @param {Object} node Component node which contains  animation to be applied
     */
    applyAnimationLinear(animation, node) {
        var animationTranslate = this.createTranslate(animation.x, animation.y, animation.z);
        var animationRotate = this.createRotate("y", animation.angle, true);
        node.transformations.push(animationTranslate);
        node.transformations.push(animationRotate);
    }

    /**
     * Visits the next node in the scene graph
     * @param {Object} node Node being visited
     * @param {Object} transformations Array with transformations from the node ancestors
     * @param {Object} materials Array with materials from the node ancestors
     * @param {Object} textures Array with textures from the node ancestors
     * @param {Object} none_texture Flag to indicate if a node doesn't have a texture
     * @param {Object} parent_currentMaterialIndex Index of the current material being used by the parent node
     */
    visitNode(node, transformations, materials, textures, none_texture, parent_currentMaterialIndex = null) {
        var currTime = this.scene.currTime;
        var remainingTime = currTime;
        let apAnimation;
        none_texture = this.pushTexture(node.texture, textures, none_texture);
        let is_inherit = this.pushMaterials(materials, node, parent_currentMaterialIndex);
    
        transformations.push(node.transformations);
        let index = 0;
        this.scene.pushMatrix();

        if (node.currentAnimationIndex != null) 
        apAnimation = this.applyAnimation(node,remainingTime);    
      
        this.applyTransformationsPush(node.transformations);
        
        if (is_inherit)
            index = parent_currentMaterialIndex;
        else
            index = node.currentMaterialIndex;
        for (let i = 0; i < node.children.primitivesRef.length; i++) {
            this.visitLeaf(node.children.primitivesRef[i], materials, textures, index, none_texture);
        }
        for (let i = 0; i < node.children.componentsRef.length; i++) {
            this.visitNode(this.components[node.children.componentsRef[i]], transformations, materials, textures, none_texture, index);
        }

        if (node.currentAnimationIndex != null) 
        {
            if (apAnimation.popAnimations)
            {
                node.transformations.pop();
                if(apAnimation.type == "Circular")
                    node.transformations.pop();
            }
            node.transformations.pop();
        }
      
        this.scene.popMatrix();
        transformations.pop();
        materials.pop();
        if (!none_texture)
            textures.pop();
        return null;
    }

    /**
     * Visits a leaf node of the scene graph, represents a primitive
     * @param {Object} leaf Node being visited
     * @param {Object} materials Array with materials from the node ancestors
     * @param {Object} textures Array with textures from the node ancestors
     * @param {Object} currentMaterialIndex Index of the material being used by the content of the node
     * @param {Object} none_texture Flag to indicate if a node doesn't have a texture
     */
    visitLeaf(leaf, materials, textures, currentMaterialIndex, none_texture) {
        let prim = this.primitives[leaf];
        this.scene.pushMatrix();
        let text = textures[textures.length - 1];
        let mat = materials[materials.length - 1];
        let m = this.materials[mat[currentMaterialIndex]];
        m.apply();
        if (!none_texture) {
            if (prim.constructor.name == "MyRectangle" || prim.constructor.name == "MyTriangle")
                prim.updateTexCoordLength(text.length_s, text.length_t);
            this.textures[text.id].bind();
        }
        else
        {
            if (prim.constructor.name == "Terrain" || prim.constructor.name == "Water")
                prim.texture.bind();
        }
        prim.display();
        this.scene.popMatrix();
    }

    /**
     * Updates all the components currentMaterialIndex
     */
    updateComponentsCurrentMaterialIndex() {
        for (let key in this.components) {
            let comp = this.components[key];
            if (comp.currentMaterialIndex >= comp.materials.length - 1)
                comp.currentMaterialIndex = 0;
            else
                comp.currentMaterialIndex++;
        }
    }
}



