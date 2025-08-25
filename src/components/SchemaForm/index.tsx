// SchemaFormAntd.tsx

import Form from "@rjsf/antd"; // ✅ 改为 @rjsf/antd
import type { IChangeEvent } from "@rjsf/core"; // ✅ 从 @rjsf/core 导入 IChangeEvent
import validator from "@rjsf/validator-ajv8";
import { Button, Divider } from "antd"; // ✅ 用 antd 按钮
import "antd/dist/reset.css"; // Ant Design 5 样式

// 文档配置 Schema
const docsSchema = {
  $ref: "#/definitions/docs",
  definitions: {
    docs: {
      type: "object",
      title: "文档配置",
      properties: {
        title: {
          type: "string",
          title: "标题",
          minLength: 1,
        },
        index: {
          type: "number",
          title: "排序索引",
          minimum: 0,
        },
        $schema: {
          type: "string",
          title: "$schema",
          description: "Schema 版本",
        },
      },
      required: ["title", "index"],
      additionalProperties: false,
    },
  },
  $schema: "http://json-schema.org/draft-07/schema#",
};

// 示例配置 Schema
const exampleSchema = {
  $ref: "#/definitions/example",
  definitions: {
    example: {
      type: "object",
      title: "示例配置",
      properties: {
        title: {
          type: "string",
          title: "标题",
        },
        index: {
          type: "number",
          title: "排序索引",
        },
        image: {
          type: "string",
          title: "图片链接",
          format: "uri",
        },
        $schema: {
          type: "string",
          title: "$schema",
        },
      },
      required: ["title", "index", "image"],
      additionalProperties: false,
    },
  },
  $schema: "http://json-schema.org/draft-07/schema#",
};

// UI Schema
const uiSchema = {
  image: {
    "ui:placeholder": "请输入图片 URL",
  },
  $schema: {
    "ui:widget": "hidden",
  },
};
// const principle_schema = {
//   $ref: "#/definitions/principle",
//   definitions: {
//     principle: {
//       type: "object",
//       properties: {
//         title: {
//           type: "string",
//         },
//         pubDate: {
//           anyOf: [
//             {
//               type: "string",
//               format: "date-time",
//             },
//             {
//               type: "string",
//               format: "date",
//             },
//             {
//               type: "integer",
//               format: "unix-time",
//             },
//           ],
//         },
//         $schema: {
//           type: "string",
//         },
//       },
//       required: ["title", "pubDate"],
//       additionalProperties: false,
//     },
//   },
//   $schema: "http://json-schema.org/draft-07/schema#",
// };
const SchemaForm = () => {
  const onSubmit = (e: IChangeEvent<any>) => {
    console.log("表单提交数据:", e.formData);
    alert("提交成功！查看控制台");
  };

  const onError = (errors: any) => {
    console.error("表单校验错误:", errors);
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h3>1. 文档配置表单</h3>
      <Form
        schema={docsSchema}
        uiSchema={uiSchema}
        validator={validator}
        onSubmit={onSubmit}
        onError={onError}
        showErrorList={false}
        formContext={{ layout: "vertical" }}
      >
        <div style={{ textAlign: "right" }}>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </div>
      </Form>

      <Divider />

      <h3>2. 示例配置表单</h3>
      <Form
        schema={exampleSchema}
        uiSchema={uiSchema}
        validator={validator}
        onSubmit={onSubmit}
        onError={onError}
        showErrorList={false}
        formContext={{ layout: "vertical" }}
      >
        <div style={{ textAlign: "right" }}>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SchemaForm;
