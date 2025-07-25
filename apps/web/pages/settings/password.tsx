import SettingsLayout from "@/layouts/SettingsLayout";
import { useState } from "react";
import { toast } from "react-hot-toast";
import TextInput from "@/components/TextInput";
import { useTranslation } from "next-i18next";
import getServerSideProps from "@/lib/client/getServerSideProps";
import { useUpdateUser, useUser } from "@linkwarden/router/user";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Password() {
  const { t } = useTranslation();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const { data: account } = useUser();
  const updateUser = useUpdateUser();

  const submit = async () => {
    if (newPassword === "" || oldPassword === "") {
      return toast.error(t("fill_all_fields"));
    }
    if (newPassword.length < 8) return toast.error(t("password_length_error"));

    setSubmitLoader(true);

    const load = toast.loading(t("applying_settings"));

    await updateUser.mutateAsync(
      {
        ...account,
        newPassword,
        oldPassword,
      },
      {
        onSettled: (data, error) => {
          setSubmitLoader(false);
          toast.dismiss(load);

          if (error) {
            toast.error(error.message);
          } else {
            setNewPassword("");
            setOldPassword("");

            toast.success(t("settings_applied"));
          }
        },
      }
    );
  };

  return (
    <SettingsLayout>
      <p className="capitalize text-3xl font-thin inline">
        {t("change_password")}
      </p>

      <Separator className="my-3" />

      <p className="mb-3">{t("password_change_instructions")}</p>
      <div className="w-full flex flex-col gap-2 justify-between">
        <p>{t("old_password")}</p>

        <TextInput
          value={oldPassword}
          className="bg-base-200"
          onChange={(e) => setOldPassword(e.target.value)}
          placeholder="••••••••••••••"
          type="password"
        />

        <p className="mt-3">{t("new_password")}</p>

        <TextInput
          value={newPassword}
          className="bg-base-200"
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••••••••"
          type="password"
        />

        <Button
          onClick={submit}
          disabled={submitLoader}
          variant="accent"
          className="mt-3 w-full sm:w-fit"
        >
          {t("save_changes")}
        </Button>
      </div>
    </SettingsLayout>
  );
}

export { getServerSideProps };
