import YAML from "yaml"

export function parsePipeline(yamlText : string){
    const doc = YAML.parse(yamlText);
    return doc.pipeline.steps;
}