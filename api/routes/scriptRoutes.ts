import express from 'express';
import {
    createScript,
    getAllScripts,
    getScriptById,
    updateScript,
    deleteScript
} from '../controllers/scriptController';
import { createScriptLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Line:
 *       type: object
 *       required:
 *         - character
 *         - dialogue
 *       properties:
 *         character:
 *           type: string
 *           description: The character speaking the line.
 *         dialogue:
 *           type: string
 *           description: The dialogue content.
 *       example:
 *         character: "Alice"
 *         dialogue: "Where is the rabbit?"
 *     ScriptSnip:
 *       type: object
 *       required:
 *         - title
 *         - characters
 *         - lines
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the script snippet.
 *           readOnly: true
 *         title:
 *           type: string
 *           description: The title of the script snippet.
 *         characters:
 *           type: array
 *           items:
 *             type: string
 *           description: List of characters appearing in the script.
 *         lines:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Line'
 *           description: The lines of dialogue or action in the script.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the script was created.
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the script was last updated.
 *           readOnly: true
 *       example:
 *         id: "60d0fe4f5311236168a109ca"
 *         title: "Sample Scene"
 *         characters: ["Alice", "Rabbit"]
 *         lines:
 *           - character: "Alice"
 *             dialogue: "Where is the rabbit?"
 *           - character: "Rabbit"
 *             dialogue: "I'm late!"
 *         createdAt: "2023-10-27T10:00:00.000Z"
 *         updatedAt: "2023-10-27T10:05:00.000Z"
 *     ScriptSnipInput:
 *       type: object
 *       required:
 *         - characters
 *         - lines
 *       properties:
 *         title:
 *           type: string
 *           description: The title of the script snippet (defaults to 'Untitled' if omitted).
 *         characters:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *           description: List of characters appearing in the script (at least one required).
 *         lines:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Line'
 *           minItems: 1
 *           description: The lines of dialogue or action in the script (at least one required).
 *     ScriptSnipUpdateInput:
 *        type: object
 *        properties:
 *          title:
 *            type: string
 *            description: The updated title of the script snippet.
 *          characters:
 *            type: array
 *            items:
 *              type: string
 *            minItems: 1
 *            description: Updated list of characters (at least one required if provided).
 *          lines:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/Line'
 *            minItems: 1
 *            description: Updated lines of dialogue or action (at least one required if provided).
 *        minProperties: 1 # Ensure at least one field is provided for update
 *   parameters:
 *     scriptId:
 *       in: path
 *       name: id
 *       schema:
 *         type: string
 *       required: true
 *       description: The script snippet ID
 *   responses:
 *     NotFound:
 *       description: The specified resource was not found.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: Resource not found
 *     BadRequest:
 *       description: Invalid input data provided.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: Invalid input data
 *               details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: string
 *                     message:
 *                       type: string
 *     Unauthorized:
 *        description: Unauthorized access.
 *     Forbidden:
 *        description: Access forbidden.
 *     InternalServerError:
 *        description: Internal server error occurred.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                error:
 *                  type: string
 *                  example: An unexpected internal server error occurred
 *     TooManyRequests:
 *        description: Too many requests made to the endpoint.
 *        content:
 *          text/html:
 *            schema:
 *              type: string
 *              example: Too many scripts created from this IP, please try again after an hour
 */

/**
 * @swagger
 * tags:
 *   name: Scripts
 *   description: Script snippet management
 */

/**
 * @swagger
 * /api/scripts:
 *   post:
 *     summary: Create a new script snippet
 *     tags: [Scripts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScriptSnipInput'
 *     responses:
 *       201:
 *         description: The script snippet was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScriptSnip'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', createScriptLimiter, createScript);

/**
 * @swagger
 * /api/scripts:
 *   get:
 *     summary: Retrieve a list of all script snippets
 *     tags: [Scripts]
 *     responses:
 *       200:
 *         description: A list of script snippets.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ScriptSnip'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', getAllScripts);

/**
 * @swagger
 * /api/scripts/{id}:
 *   get:
 *     summary: Retrieve a single script snippet by ID
 *     tags: [Scripts]
 *     parameters:
 *       - $ref: '#/components/parameters/scriptId'
 *     responses:
 *       200:
 *         description: The requested script snippet.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScriptSnip'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', getScriptById);

/**
 * @swagger
 * /api/scripts/{id}:
 *   put:
 *     summary: Update a script snippet by ID
 *     tags: [Scripts]
 *     parameters:
 *       - $ref: '#/components/parameters/scriptId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScriptSnipUpdateInput'
 *     responses:
 *       200:
 *         description: The script snippet was successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScriptSnip'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', updateScript);

/**
 * @swagger
 * /api/scripts/{id}:
 *   delete:
 *     summary: Delete a script snippet by ID
 *     tags: [Scripts]
 *     parameters:
 *       - $ref: '#/components/parameters/scriptId'
 *     responses:
 *       204:
 *         description: The script snippet was successfully deleted (No Content).
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', deleteScript);

export default router;