import TableAdminClient from "./TableAdminClient";

function envFlag(
  value: string | undefined,
) {
  return ["1", "true", "yes", "on"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

export default function AdminTablePage() {
  const iotEnabled =
    envFlag(
      process.env.IoT_Addon,
    );

  return (
    <TableAdminClient
      iotEnabled={
        iotEnabled
      }
    />
  );
}
